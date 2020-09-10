import pgljs from '../pgljs/dist/index.js';
import * as THREE from 'three';
import { IDecodingTask, ITaskData, ITaskResult, IGeom } from './interfaces';

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
                    workers.get(this).forEach(task => task.reject({ err: 'initialization failed', userData: task.userData }));
                    this.terminate();
                    workers.delete(this);
                }
            } else {
                if (workers.get(this).length) {
                    const { resolve, reject, userData } = workers.get(this).shift();
                    if (evt.data.error) {
                        reject({ error: evt.data.error, userData});
                    } else {
                        let meshs: THREE.Mesh[] = evt.data.map((geom: IGeom) => {
                            let mesh;
                            const geometry = new THREE.BufferGeometry();
                            geometry.setIndex(new THREE.BufferAttribute(new Uint32Array(geom.index), 1));
                            geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(geom.position), 3));
                            const material = new THREE.MeshPhongMaterial({
                                side: THREE.DoubleSide,
                                shadowSide: THREE.BackSide,
                                color: new THREE.Color(...geom.material.ambient),
                                emissive: new THREE.Color(...geom.material.emission),
                                specular: new THREE.Color(...geom.material.specular),
                                shininess: geom.material.shininess * 100,
                                transparent: geom.material.transparency > 0,
                                opacity: 1 - geom.material.transparency,
                                vertexColors: false
                            });
                            if (geom.isInstanced) {
                                const instances = new Float32Array(geom.instances);
                                mesh = new THREE.InstancedMesh(geometry, material, instances.length / 16);
                                for (let i = 0; i < instances.length / 16; i++) {
                                    mesh.setMatrixAt(i, (new THREE.Matrix4() as any).set(...instances.slice(i * 16, i * 16 + 16)));
                                }
                            } else {
                                mesh = new THREE.Mesh(geometry, material);
                            }
                            geometry.computeVertexNormals();
                            mesh.castShadow = true;
                            mesh.receiveShadow = true;
                            return mesh;
                        });

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
