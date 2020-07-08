// support for shipping static content in jupyter is not very good currently. Therefore we bundle everything
// https://github.com/jupyterlab/jupyterlab/issues/3691

fs = require('fs')

const worker = Buffer.from(fs.readFileSync('build/worker.js')).toString('base64');
fs.writeFileSync('build/worker_base64.js', `export default "${worker}";\n`);
