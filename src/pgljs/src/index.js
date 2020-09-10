import * as pako from 'pako';
import worker from '../build/worker_base64.js';
import wasm from '../build/pgl_base64.wasm.js';
const workerURL= URL.createObjectURL(new Blob([pako.inflate(atob(worker), { to: 'string' })], { type: 'text/javascript' }));
const wasmBinary = pako.inflate(Uint8Array.from(atob(wasm), c => c.charCodeAt(0))).buffer;
export default () => {
    const worker = new Worker(workerURL);
    worker.postMessage({ wasmBinary });
    return worker;
};
