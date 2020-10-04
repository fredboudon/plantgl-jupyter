@echo on
MKDIR \emsdk
cd \emsdk
git clone https://github.com/emscripten-core/emsdk.git
cd emsdk
./emsdk.bat install latest
./emsdk.bat activate latest
./emsdk_env.bat
cd %SRC_DIR%