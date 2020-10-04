@echo on
MKDIR \emsdk
cd \emsdk
git clone https://github.com/emscripten-core/emsdk.git
cd emsdk
call ./emsdk.bat install latest
call ./emsdk.bat activate latest
call ./emsdk_env.bat
cd %SRC_DIR%