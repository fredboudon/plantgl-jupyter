#!/bin/bash

echo "****** START OF BUILD PROCESS"

jupyter labextension install --no-build @jupyter-widgets/jupyterlab-manager

echo 
echo "****** install emsdk"
git clone https://github.com/emscripten-core/emsdk.git
cd emsdk
./emsdk install latest
./emsdk activate latest
source ./emsdk_env.sh
cd ..

echo 
echo "****** fetch plantgl and install pgljs deps"
git submodule update --init --recursive
cd src/pgljs
npm install
cd ../..

echo 
echo "****** install pgljupyter deps and build"
npm install
#npm run build:all # done by pip install.

echo 
echo "****** install python modules and jupyter extensions"
pip install -v .
jupyter nbextension install --sys-prefix --overwrite --py pgljupyter
jupyter nbextension enable --sys-prefix --py pgljupyter
#jupyter labextension install --no-build pgljupyter 
#jupyter lab clean

echo 
echo "****** END OF BUILD PROCESS"
