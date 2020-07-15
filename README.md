
[![Binder](https://mybinder.org/badge_logo.svg)](https://mybinder.org/v2/gh/jvail/plantgl-jupyter.git/master?urlpath=lab&filepath=examples/lpy/leuwenberg.ipynb)

# pgljupyter

PlantGL & L-Py jupyter widgets

## Install and run from source

 - install jupyterlab and widgetsextension

```bash
pip install jupyterlab>=2.5.1 ipywidgets>=7.0.0
jupyter labextension install --no-build @jupyter-widgets/jupyterlab-manager
```

 - install emsdk: https://emscripten.org/docs/getting_started/downloads.html

```bash
git clone https://github.com/emscripten-core/emsdk.git
cd emsdk
./emsdk install latest
./emsdk activate latest
source ./emsdk_env.sh
cd ..
```

 - get pgljupyter source

```bash
git clone https://github.com/jvail/plantgl-jupyter.git
cd plantgl-jupyter
```

 - fetch plantgl and install pgljs deps (requires activation of emsdk i.e. source ./emsdk_env.sh)

```bash
git submodule update --init --recursive
cd src/pgljs
npm install
cd ../..
```

 - install deps and build

```bash
npm install
npm run build:pgljs && npm run build
```

 - install python modules and jupyter extensions

```bash
pip install -e .
jupyter nbextension install --sys-prefix --overwrite --py pgljupyter
jupyter nbextension enable --sys-prefix --py pgljupyter
jupyter labextension install . --minimize=False --dev-build=False
jupyter lab clean
```

 - run the lab

```bash
jupyter lab --browser=google-chrome --notebook-dir=./examples
```
