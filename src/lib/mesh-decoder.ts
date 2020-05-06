import getWorker from 'draco-web-decoder';
import * as THREE from 'three';
import { IDecodingTask, ITaskData, ITaskResult } from './interfaces';

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

const MAX_WORKER = 5;
const decoders: Map<Worker, IDecodingTask[]> = new Map();
const getDecoder = () => {

    const avg = Array.from(decoders.values()).reduce((s, v) => s + v.length / decoders.size, 0);

    if ((!decoders.size || avg > 2) && decoders.size < MAX_WORKER) {
        const worker: Worker = getWorker();
        decoders.set(worker, []);
        worker.onerror = function (evt) {
            console.log(evt);
        }
        worker.onmessage = function(this: Worker, evt) {
            const data = evt.data;
            if (data && 'initialized' in data) {
                if (data.initialized) {
                    // console.log('initialized');
                    this.postMessage(makeMsg(decoders.get(this)[0].drcs));
                } else {
                    // console.log('terminate on error');
                    const tasks = decoders.get(this);
                    worker.terminate();
                    decoders.delete(this);
                    tasks.forEach(task => task.reject());
                }
            } else {
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
                    const { resolve, userData } = decoders.get(this).shift();
                    resolve({ results, userData });
                    // console.log(Array.from(decoders.values()).map(v => v.length));
                } else {
                    decoders.get(this).shift().reject();
                }
                if (decoders.get(this).length === 0) {
                    setTimeout((self => (() => {
                        if (decoders.get(self).length === 0) {
                            decoders.delete(self);
                            // console.log('terminated');
                            self.terminate();
                        } else {
                            self.postMessage(makeMsg(decoders.get(self)[0].drcs));
                        }
                    }))(this), 1000);
                } else {
                    this.postMessage(makeMsg(decoders.get(this)[0].drcs));
                }
            }
        };
        return worker;
    } else {
        let worker = decoders.keys().next().value;
        for (const key of decoders.keys()) {
            if (!decoders.get(key).length) {
                worker = key;
                break;
            }
            if (decoders.get(worker).length > decoders.get(key).length) {
                worker = key;
            }
        }
        return worker;
    }

};

class Decoder {

    decode = (task: ITaskData): Promise<ITaskResult> => {
        const decoder = getDecoder();
        return new Promise((resolve, reject) => {
            decoders.get(decoder).push({ resolve, reject, ...task });
        });
    }

};

export default new Decoder();
