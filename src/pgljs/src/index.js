import worker from '../build/worker_base64.js';
import wasm from '../build/pgl.wasm.js';
const workerURL= URL.createObjectURL(new Blob([atob(worker)], { type: 'text/javascript' }));
const wasmURL = URL.createObjectURL(new Blob([
    Uint8Array.from(atob(wasm), c => c.charCodeAt(0))
], { type: 'application/octet-stream' }));
export default () => {
    const worker = new Worker(workerURL);
    worker.postMessage({ wasmURL });
    return worker;
};
