// TODO: add worker pool that adds additional worker on high load

import getWorker from 'draco-mesh-web-decoder';
import * as THREE from 'three';
let worker: Worker = null;
let initialized = false;
const queue = [];
const decode = (drc: ArrayBuffer): Promise<THREE.BufferGeometry> => {
    if (!worker) {
        worker = getWorker();
        worker.onmessage = (evt) => {
            const data = evt.data;
            if (data) {
                if ('initialized' in data && data.initialized) {
                    initialized = true;
                } else if (data && data instanceof Object) {
                    const geometry = new THREE.BufferGeometry();
                    geometry.setIndex(new THREE.BufferAttribute(data.index.array, 1));
                    data.attributes.forEach(attribute => {
                        geometry.setAttribute(
                            attribute.name,
                            new THREE.BufferAttribute(attribute.array, attribute.itemSize, attribute.name === 'color')
                        );
                    });
                    queue.shift().resolve(geometry);
                }
            } else {
                queue.shift().reject();
            }
            if (queue.length > 0) {
                worker.postMessage(queue[0].drc);
            }
        };
    }
    return new Promise((resolve, reject) => {
        queue.push({ resolve, reject, drc });
        if (queue.length === 1) {
            worker.postMessage(queue[0].drc);
        }
    });
}

export default decode;
