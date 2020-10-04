echo "****** START OF BUILD PROCESS"

REM jupyter labextension install --no-build @jupyter-widgets/jupyterlab-manager

echo "install emsdk"
call conda/emsdk_install.bat
if errorlevel 1 exit 1

echo "fetch plantgl and install pgljs deps"
git submodule update --init --recursive
cd src/pgljs
npm install
cd ../..
if errorlevel 1 exit 1

echo "install pgljupyter deps and build"
npm install
REM npm run build:pgljs
if errorlevel 1 exit 1

echo "install python modules and jupyter extensions"

pip install .
if errorlevel 1 exit 1

"%PREFIX%\Scripts\jupyter-nbextension.exe" install --sys-prefix --overwrite --py pgljupyter
if errorlevel 1 exit 1

REM jupyter nbextension enable --sys-prefix --py pgljupyter
REM jupyter labextension install .
REM jupyter lab clean

echo "****** END OF BUILD PROCESS"