echo "****** START OF BUILD PROCESS"

REM jupyter labextension install --no-build @jupyter-widgets/jupyterlab-manager

echo "install emsdk"
git clone https://github.com/emscripten-core/emsdk.git
cd emsdk
./emsdk.bat install latest
./emsdk.bat activate latest
./emsdk_env.bat
cd ..

echo "fetch plantgl and install pgljs deps"
git submodule update --init --recursive
cd src/pgljs
npm install
cd ../..

echo "install pgljupyter deps and build"
npm install
npm run build:pgljs

echo "install python modules and jupyter extensions"

pip install .
jupyter nbextension install --sys-prefix --overwrite --py pgljupyter
REM jupyter nbextension enable --sys-prefix --py pgljupyter
REM jupyter labextension install .
REM jupyter lab clean

echo "****** END OF BUILD PROCESS"