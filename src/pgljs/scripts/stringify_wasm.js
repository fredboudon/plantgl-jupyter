// support for shipping static content in jupyter is not very good currently. Therefore we bundle everything
// https://github.com/jupyterlab/jupyterlab/issues/3691
fs = require('fs')

const wasm = Buffer.from(fs.readFileSync('build/pgl.wasm')).toString('base64');
fs.writeFileSync('build/pgl.wasm.js', `export default "${wasm}"`);
