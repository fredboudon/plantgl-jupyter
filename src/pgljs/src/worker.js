import PGL from '../build/pgl.js';
let pgl = null;
self.onmessage = function (evt) {
    const data = evt.data;
    if (pgl) {
        try {
            if (!(evt.data instanceof ArrayBuffer)) {
                throw new Error('data not an ArrayBuffer');
            }
            const meshs = pgl.parse(evt.data);
            postMessage(meshs, meshs.reduce((arr, mesh) =>  {
                arr.push(mesh.color);
                arr.push(mesh.index);
                arr.push(mesh.position);
                if (mesh.instances.byteLength) {
                    arr.push(mesh.instances);
                }
                return arr;
            }, []));
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
