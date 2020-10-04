echo "****** START OF BUILD PROCESS"
echo "fetch plantgl and install pgljs deps"
git submodule update --init --recursive
if errorlevel 1 exit 1

"%PREFIX%\Scripts\jupyter-labextension.exe"  install --no-build @jupyter-widgets/jupyterlab-manager
echo "PATH test"
@echo %PATH%

set PPATH=%PATH%
echo "install emsdk"
call conda/emsdk_install.bat
if errorlevel 1 exit 1

echo "PATH test"
echo %PATH%
set PATH=%PPATH%;%PATH%

echo "install pgljupyter deps and build"
cd src/pgljs
call npm install
if errorlevel 1 exit 1

cd ../..
call npm install
if errorlevel 1 exit 1

echo "install python modules and jupyter extensions"

call "%PREFIX%\Scripts\pip.exe" install .
if errorlevel 1 exit 1

"%PREFIX%\Scripts\jupyter-nbextension.exe" install --sys-prefix --overwrite --py pgljupyter
if errorlevel 1 exit 1

REM jupyter nbextension enable --sys-prefix --py pgljupyter
REM jupyter labextension install .
REM jupyter lab clean

echo "****** END OF BUILD PROCESS"