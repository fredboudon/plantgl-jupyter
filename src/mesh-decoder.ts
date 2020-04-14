// TODO: add worker pool that adds additional worker on high load

import getWorker from 'draco-mesh-web-decoder';
import * as THREE from 'three';
import { IDecodingTask, ITaskData, ITaskResult } from './interfaces';

const MAX_WORKER = 5;
const decoders: Map<Worker, IDecodingTask[]> = new Map();
const getDecoder = () => {

    const avg = Array.from(decoders.values()).reduce((s, v) => s + v.length / decoders.size, 0);
    if ((!decoders.size || avg > 5) && decoders.size < MAX_WORKER) {
        const worker: Worker = getWorker();
        decoders.set(worker, []);
        worker.onmessage = function(this: Worker, evt) {
            const data = evt.data;
            if (data && 'initialized' in data) {
                if (data.initialized) {
                    this.postMessage(decoders.get(this)[0].drc);
                } else {
                    worker.terminate();
                    decoders.get(this)[0].reject();
                    decoders.delete(this);
                }
            } else {
                if (data && data instanceof Object) {
                    const geometry = new THREE.BufferGeometry();
                    geometry.setIndex(new THREE.BufferAttribute(data.index.array, 1));
                    data.attributes.forEach(attribute => {
                        geometry.setAttribute(
                            attribute.name,
                            new THREE.BufferAttribute(attribute.array, attribute.itemSize, attribute.name === 'color')
                        );
                    });
                    const { resolve, userData } = decoders.get(this).shift();
                    resolve({ geometry, userData });
                } else {
                    decoders.get(this).shift().reject();
                }
                if (decoders.get(this).length === 0) {
                    if (decoders.size > 1) {
                        decoders.delete(this);
                        this.terminate();
                    }
                } else {
                    this.postMessage(decoders.get(this)[0].drc);
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

}
class Decoder {

    decode = (task: ITaskData): Promise<ITaskResult> => {
        const decoder = getDecoder();
        return new Promise((resolve, reject) => {
            decoders.get(decoder).push({ resolve, reject, ...task });
        });
    }

};

export default new Decoder();
