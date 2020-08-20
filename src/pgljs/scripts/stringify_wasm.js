// support for shipping static content in jupyter is not very good currently. Therefore we bundle everything
// https://github.com/jupyterlab/jupyterlab/issues/3691
const fs = require('fs');
const pako = require('pako');
const wasm = Buffer.from(pako.deflate(fs.readFileSync('build/pgl.wasm'), { level: 9 })).toString('base64');
fs.writeFileSync('build/pgl_base64.wasm.js', `export default "${wasm}"`);
