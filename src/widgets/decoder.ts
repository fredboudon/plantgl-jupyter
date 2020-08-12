import pgljs from '../pgljs/dist/index.js';
import * as THREE from 'three';
import { IDecodingTask, ITaskData, ITaskResult, IGeom, IMaterial } from './interfaces';
import { merge } from './utilities';
import { group } from 'console';
import { access } from 'fs';

let MAX_WORKER = 10;
const workers: Map<Worker, IDecodingTask[]> = new Map();
const getWorker = (): Worker => {

    const avg = Array.from(workers.values()).reduce((s, v) => s + v.length / workers.size, 0);

    if ((workers.size === 0 || avg >= 1) && workers.size < MAX_WORKER) {
        const worker = pgljs();
        workers.set(worker, []);
        worker.onerror = function (evt) {
            console.log(evt);
        }
        worker.onmessage = function(this: Worker, evt) {

            if (evt.data && 'initialized' in evt.data) {
                if (evt.data.initialized) {
                    // console.log('initialized');
                    workers.get(this).forEach(task => this.postMessage(task.data));
                    (this as any).initialized = true;
                } else {
                    // console.log('terminate on error');
                    const tasks = workers.get(this);
                    worker.terminate();
                    workers.delete(this);
                    tasks.forEach(task => task.reject());
                }
            } else {
                if (workers.get(this).length) {
                    const { resolve, reject, userData } = workers.get(this).shift();
                    if (evt.data.error) {
                        reject({ error: evt.data.error, userData});
                    } else {

                        const data = evt.data as IGeom[];
                        let meshs: THREE.Mesh[] = [];

                        meshs.push(...data.filter(d => !d.isInstanced).map(d => {
                            const geometry = new THREE.BufferGeometry();
                            const material0 = d.materials[0];
                            const material = new THREE.MeshPhongMaterial({
                                side: THREE.DoubleSide,
                                shadowSide: THREE.BackSide,
                                color: new THREE.Color(...material0.ambient.map(c => c / 255)),
                                emissive: new THREE.Color(...material0.emission.map(c => c / 255)),
                                specular: new THREE.Color(...material0.specular.map(c => c / 255)),
                                shininess: material0.shininess * 100,
                                transparent: material0.transparency > 0,
                                opacity: 1 - material0.transparency,
                                vertexColors: false
                            });
                            geometry.setIndex(new THREE.BufferAttribute(new Uint32Array(d.index), 1));
                            geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(d.position), 3));
                            // geometry.setAttribute('color', new THREE.InstancedBufferAttribute(new Uint8Array(colors), 3, true, 1));
                            // geometry.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(d.normal), 3));
                            geometry.computeVertexNormals();

                            const mesh = new THREE.Mesh(geometry, material);
                            mesh.castShadow = true;
                            mesh.receiveShadow = true;
                            return mesh;
                        }));

                        // group instanced geometries by material if there are multiple materials
                        // TODO: Move to c++, introduce material ID?
                        const grouped = data.filter(d => d.isInstanced && d.materials.length > 1).map(d => {
                            return [d, d.materials.reduce((grouped: { m: IMaterial, i: number[] }[], m, j) => {
                                const group = grouped.find(group => {
                                    return !(group.m.transparency !== m.transparency ||
                                        group.m.shininess !== m.shininess ||
                                        group.m.ambient.join('') !== m.ambient.join('') ||
                                        group.m.specular.join('') !== m.specular.join('') ||
                                        group.m.emission.join('') !== m.emission.join(''));
                                });
                                if (group) {
                                    group.i.push(j);
                                } else {
                                    grouped.push({ m, i: [j]})
                                }
                                return grouped;
                            }, [])];
                        });

                        meshs.push(...grouped.reduce((a: THREE.Mesh[], b: any) => {
                            const len = 16 * 4; // instance matrix in bytes
                            const geom = b[0];
                            const groups: { m: IMaterial, i: number[] }[] = b[1];
                            groups.forEach(group => {
                                const geometry = new THREE.BufferGeometry();
                                const instances = group.i.reduce((a: Float32Array, j, i) => {
                                    a.set(new Float32Array(geom.instances.slice(j * len, j * len + len)), i * 16);
                                    return a;
                                }, new Float32Array(group.i.length * 64));

                                const material0 = group.m;
                                const material = new THREE.MeshPhongMaterial({
                                    side: THREE.DoubleSide,
                                    shadowSide: THREE.BackSide,
                                    color: new THREE.Color(...material0.ambient.map(c => c / 255)),
                                    emissive: new THREE.Color(...material0.emission.map(c => c / 255)),
                                    specular: new THREE.Color(...material0.specular.map(c => c / 255)),
                                    shininess: material0.shininess * 100,
                                    transparent: material0.transparency > 0,
                                    opacity: 1 - material0.transparency,
                                    vertexColors: false
                                });
                                geometry.setIndex(new THREE.BufferAttribute(new Uint32Array(geom.index), 1));
                                geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(geom.position), 3));
                                // geometry.setAttribute('color', new THREE.InstancedBufferAttribute(new Uint8Array(colors), 3, true, 1));
                                // geometry.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(d.normal), 3));
                                geometry.computeVertexNormals();

                                const mesh = new THREE.InstancedMesh(geometry, material, instances.length / 16);
                                for (let i = 0; i < instances.length / 16; i++) {
                                    mesh.setMatrixAt(i, (new THREE.Matrix4() as any).set(...instances.slice(i * 16, i * 16 + 16)));
                                }
                                mesh.castShadow = true;
                                mesh.receiveShadow = true;
                                a.push(mesh);
                            });

                            return a;
                        }, []));

                        meshs.push(...data.filter(d => d.isInstanced && d.materials.length === 1).map(d => {
                            const geometry = new THREE.BufferGeometry();
                            const instances = new Float32Array(d.instances);
                            const material0 = d.materials[0];
                            const material = new THREE.MeshPhongMaterial({
                                side: THREE.DoubleSide,
                                shadowSide: THREE.BackSide,
                                color: new THREE.Color(...material0.ambient.map(c => c / 255)),
                                emissive: new THREE.Color(...material0.emission.map(c => c / 255)),
                                specular: new THREE.Color(...material0.specular.map(c => c / 255)),
                                shininess: material0.shininess * 100,
                                transparent: material0.transparency > 0,
                                opacity: 1 - material0.transparency,
                                vertexColors: false
                            });
                            geometry.setIndex(new THREE.BufferAttribute(new Uint32Array(d.index), 1));
                            geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(d.position), 3));
                            // geometry.setAttribute('color', new THREE.InstancedBufferAttribute(new Uint8Array(colors), 3, true, 1));
                            // geometry.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(d.normal), 3));
                            geometry.computeVertexNormals();

                            const mesh = new THREE.InstancedMesh(geometry, material, instances.length / 16);
                            for (let i = 0; i < instances.length / 16; i++) {
                                mesh.setMatrixAt(i, (new THREE.Matrix4() as any).set(...instances.slice(i * 16, i * 16 + 16)));
                            }
                            mesh.castShadow = true;
                            mesh.receiveShadow = true;
                            return mesh;
                        }));

                        resolve({ results: meshs, userData });
                    }
                }
            }

            if (workers.get(this).length === 0) {
                setTimeout((self => (() => {
                    if (workers.get(self) && workers.get(self).length === 0) {
                        workers.delete(self);
                        // console.log('terminated');
                        self.terminate();
                    }
                }))(this), 60000);
            }
        };
        // console.log('workers', Array.from(workers.values()).map(w => w.length));
        return worker;

    } else {
        let worker = workers.keys().next().value;
        for (const key of workers.keys()) {
            if (!workers.get(key).length) {
                worker = key;
                break;
            }
            if (workers.get(worker).length > workers.get(key).length) {
                worker = key;
            }
        }
        // console.log('workers', Array.from(workers.values()).map(w => w.length));
        return worker;
    }

};

class Decoder {

    decode(task: ITaskData, bucketID: string = ''): Promise<ITaskResult> {
        const worker = getWorker();
        return new Promise((resolve, reject) => {
            workers.get(worker).push({ bucketID, resolve, reject, ...task });
            if ((worker as any).initialized) {
                worker.postMessage(task.data);
            }
        });
    }

    abort(bucketID: string) {
        let tasks: IDecodingTask[] = [];
        for (const worker of workers.keys()) {
            tasks = [...tasks, ...workers.get(worker).filter(task => task.bucketID === bucketID)];
            workers.set(worker, workers.get(worker).filter(task => task.bucketID !== bucketID));
        }
        // reject in order
        tasks.sort((a, b) => a.userData.no - b.userData.no)
            .forEach(task => task.reject({ abort: true, userData: task.userData }))
    }

};

export default new Decoder();
