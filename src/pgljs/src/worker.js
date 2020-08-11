import PGL from '../build/pgl.js';
import * as pako from 'pako';
let pgl = null;
self.onmessage = function (evt) {
    let data = evt.data;
    if (pgl) {
        let inflated;
        try {
            if (!(data instanceof ArrayBuffer)) {
                throw new Error('data not an ArrayBuffer');
            }
            try {
                inflated = pako.inflate(new Uint8Array(data));
            } catch(err) { } finally {
                if (inflated instanceof Uint8Array) {
                    data = inflated
                }
                const meshs = pgl.parse(data);
                postMessage(meshs, meshs.reduce((arr, mesh) =>  {
                    // arr.push(mesh.color);
                    arr.push(mesh.index);
                    arr.push(mesh.position);
                    // arr.push(mesh.normal);
                    if (mesh.instances.byteLength) {
                        arr.push(mesh.instances);
                    }
                    return arr;
                }, []));
            };
        } catch (err) {
            postMessage({ error: err.toString() });
        }
    } else {
        if ('wasmURL' in data) {
            try {
                fetch(data.wasmURL)
                    .then(res => res.arrayBuffer())
                    .then(wasmBinary => {
                        PGL({ wasmBinary })
                            .then(pgl_ => {
                                pgl = pgl_;
                                self.postMessage({ initialized: true });
                            });
                    });
            } catch (err) {
                console.log(err)
            }
        }
    }

}
