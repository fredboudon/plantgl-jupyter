import makeWorker from 'draco-web-decoder';
import * as THREE from 'three';
import { IDecodingTask, ITaskData, ITaskResult } from './types';

const makeMsg = (drcs) => ({
    drc: drcs,
    configs: {
        metadata: [
            { name: 'id', type: 'int' },
            { name: 'type', type: 'string' },
            { name: 'instances', type: 'mesh' }
        ]
    }
});

let MAX_WORKER = 5;
const workers: Map<Worker, IDecodingTask[]> = new Map();
const getWorker = (sequential=false): Worker => {
    if (sequential) {
        MAX_WORKER = 1;
    }
    const avg = Array.from(workers.values()).reduce((s, v) => s + v.length / workers.size, 0);

    if ((!workers.size || avg > 4) && workers.size < MAX_WORKER) {
        const worker: Worker = makeWorker();
        workers.set(worker, []);
        worker.onerror = function (evt) {
            console.log(evt);
        }
        worker.onmessage = function(this: Worker, evt) {
            const data = evt.data;
            if (data && 'initialized' in data) {
                if (data.initialized) {
                    // console.log('initialized');
                    (this as any).initialized = true;
                    workers.get(this).forEach(task => this.postMessage(makeMsg(task.drcs)))
                } else {
                    // console.log('terminate on error');
                    const tasks = workers.get(this);
                    worker.terminate();
                    workers.delete(this);
                    tasks.forEach(task => task.reject());
                }
            } else {
                // console.log(Array.from(workers.values()).map(v => v.length));
                const { resolve, reject, userData } = workers.get(this).shift();
                if (data && Array.isArray(data)) {

                    const results = data.reduce((results, d, i)=> {
                        let instances;
                        const metaData = d.metadata;
                        const geometry = new THREE.BufferGeometry();
                        geometry.setIndex(new THREE.BufferAttribute(d.index.array, 1));
                        d.attributes.forEach(attribute => {
                            if (!(metaData.type === 'instanced_mesh' && attribute.name === 'color')) {
                                geometry.setAttribute(
                                    attribute.name,
                                    new THREE.BufferAttribute(attribute.array, attribute.itemSize, attribute.name === 'color')
                                );
                            }
                        });
                        if (metaData.type === 'instanced_mesh' && metaData.instances && metaData.instances.metadata.type === 'instances') {
                            instances = {
                                ...metaData.instances.attributes.reduce((data, attr) => {
                                    if (attr.name === 'position') {
                                        const size = attr.itemSize;
                                        const count = attr.array.length / size;
                                        for (let i = 0; i < count; i++) {
                                            data.matrices.push(Array.from(attr.array.slice(i * size, i * size + size)));
                                        }
                                    } else if (attr.name === 'color') {
                                        geometry.setAttribute('color', new THREE.InstancedBufferAttribute(attr.array, 3, true));
                                    }
                                    return data;
                                }, { matrices: [] }),
                                metaData: metaData.instances.metadata
                            }
                        }
                        results.push({ geometry, metaData, instances })
                        return results;
                    }, []);

                    resolve({ results, userData });

                } else {
                    reject(userData);
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
            }
        };
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
        return worker;
    }

};

class Decoder {

    decode = (task: ITaskData, sequential=false): Promise<ITaskResult> => {
        const worker = getWorker(sequential);
        return new Promise((resolve, reject) => {
            workers.get(worker).push({ resolve, reject, ...task });
            if ((worker as any).initialized) {
                worker.postMessage(makeMsg(task.drcs));
            }
        });
    }

};

export default new Decoder();
