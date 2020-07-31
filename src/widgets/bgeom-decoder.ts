import pgljs from '../pgljs/dist/index.js';
import * as THREE from 'three';
import { IDecodingTask, ITaskData, ITaskResult, IGeom } from './interfaces';
import { merge } from './utilities';

let MAX_WORKER = 5;
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
                const { resolve, reject, userData } = workers.get(this).shift();
                if (evt.data.error) {
                    reject({ error: evt.data.error, userData});
                } else {

                    const data = evt.data as IGeom[];
                    let meshs = [];

                    const geometries = data.filter(d => !d.isInstanced);

                    if (geometries.length > 0) {
                        const geometry = merge(geometries);
                        const mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({
                            side: THREE.DoubleSide,
                            shadowSide: THREE.BackSide,
                            vertexColors: true,
                            roughness: 0.7
                        }));
                        mesh.castShadow = true;
                        mesh.receiveShadow = true;
                        meshs.push(mesh);
                    }

                    meshs = [...meshs, ...data.filter(d => d.isInstanced).map(d => {
                        const geometry = new THREE.BufferGeometry();
                        const instances = new Float32Array(d.instances);
                        const material = new THREE.MeshStandardMaterial({
                            side: THREE.DoubleSide,
                            shadowSide: THREE.BackSide,
                            roughness: 0.7,
                            vertexColors: true
                        });

                        geometry.setIndex(new THREE.BufferAttribute(new Uint32Array(d.index), 1));
                        geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(d.position), 3));
                        geometry.setAttribute('color', new THREE.InstancedBufferAttribute(new Uint8Array(d.color), 3, true));
                        geometry.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(d.normal), 3));

                        const mesh = new THREE.InstancedMesh(geometry, material, instances.length / 16);
                        for (let i = 0; i < instances.length / 16; i++) {
                            mesh.setMatrixAt(i, (new THREE.Matrix4() as any).set(...instances.slice(i * 16, i * 16 + 16)));
                        }
                        mesh.castShadow = true;
                        mesh.receiveShadow = true;
                        return mesh;
                    })];

                    resolve({ results: meshs, userData });
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

    decode = async (task: ITaskData): Promise<ITaskResult> => {

        const worker = getWorker();
        return new Promise((resolve, reject) => {
            workers.get(worker).push({ resolve, reject, ...task });
            if ((worker as any).initialized) {
                worker.postMessage(task.data);
            }
        });
    }

};

export default new Decoder();
