import * as pako from 'pako';
import workerStr from '../build/worker_base64.js';
import wasmStr from '../build/pgl_base64.wasm.js';
const workerURL= URL.createObjectURL(new Blob([pako.inflate(atob(workerStr), { to: 'string' })], { type: 'text/javascript' }));
const wasmBinary = pako.inflate(Uint8Array.from(atob(wasmStr), c => c.charCodeAt(0))).buffer;
export default () => {
    const worker = new Worker(workerURL);
    worker.postMessage({ wasmBinary });
    return worker;
};
