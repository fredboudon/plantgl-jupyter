echo "****** START OF BUILD PROCESS"
REM echo "fetch plantgl and install pgljs deps"
REM git submodule update --init --recursive
REM if errorlevel 1 exit 1

REM "%PREFIX%\Scripts\jupyter-labextension.exe"  install --no-build @jupyter-widgets/jupyterlab-manager
REM echo "PATH test"
REM @echo %PATH%

REM set PPATH=%PATH%
REM echo "install emsdk"
REM call conda/emsdk_install.bat
REM if errorlevel 1 exit 1

REM echo "PATH test"
REM echo %PATH%
REM set PATH=%PPATH%;%PATH%

REM echo "install pgljupyter deps and build"
REM cd src/pgljs
REM call npm install
REM if errorlevel 1 exit 1

REM cd ../..
REM call npm install
REM if errorlevel 1 exit 1

echo "install python modules and jupyter extensions"

REM call "%PREFIX%\Scripts\pip.exe" install .
REM if errorlevel 1 exit 1

REM "%PREFIX%\Scripts\jupyter-nbextension.exe" install --sys-prefix --overwrite --py pgljupyter
REM if errorlevel 1 exit 1

REM jupyter nbextension enable --sys-prefix --py pgljupyter
REM jupyter labextension install .
REM jupyter lab clean

REM call "%PREFIX%\Scripts\pip.exe" install pgljupyter

echo "****** END OF BUILD PROCESS"