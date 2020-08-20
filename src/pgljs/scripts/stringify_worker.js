// support for shipping static content in jupyter is not very good currently. Therefore we bundle everything
// https://github.com/jupyterlab/jupyterlab/issues/3691

const fs = require('fs')
const pako = require('pako');
const worker = Buffer.from(pako.deflate(fs.readFileSync('build/worker.js'), { level: 9 })).toString('base64');
fs.writeFileSync('build/worker_base64.js', `export default "${worker}";\n`);
