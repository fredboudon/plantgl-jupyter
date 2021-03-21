import * as pako from 'pako';
import worker from '../build/worker_base64.js';
import wasm from '../build/pgl_base64.wasm.js';
const workerURL= URL.createObjectURL(new Blob([pako.inflate(atob(worker), { to: 'string' })], { type: 'text/javascript' }));
const wasmURL = URL.createObjectURL(new Blob([pako.inflate(Uint8Array.from(atob(wasm), c => c.charCodeAt(0))).buffer], { type: 'application/wasm' }));
export default (id) => {
    const worker = new Worker(workerURL);
    worker.postMessage({ wasmURL });
    return worker;
};
