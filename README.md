
[![Binder](https://mybinder.org/badge_logo.svg)](https://mybinder.org/v2/gh/jvail/plantgl-jupyter/master?urlpath=lab/tree/examples/lpy/leuwenberg/leuwenberg.ipynb)

# pgljupyter

PlantGL & L-Py jupyter widgets

## Install with pip - inside conda env

```bash
conda create -y -n pgljupyter -c fredboudon -c conda-forge \
    'openalea.lpy>=3.4.0' 'jupyterlab>=2.2.0' 'ipywidgets>=7.5.0'
conda activate pgljupyter
pip install pgljupyter
jupyter labextension install --no-build @jupyter-widgets/jupyterlab-manager
jupyter lab build && jupyter lab
```

## Build, install and run from source

 - install lpy, plantgl, jupyterlab, widgets and widgetsextension

```bash
conda create -y -n pgljupyter -c fredboudon -c conda-forge \
    'openalea.lpy>=3.4.0' 'jupyterlab>=2.2.0' 'ipywidgets>=7.5.0'
conda activate pgljupyter
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

 - fetch plantgl and install pgljs deps

```bash
git submodule update --init --recursive
cd src/pgljs
npm install
cd ../..
```

 - install pgljupyter deps and build (requires activation of emsdk i.e. source ./emsdk_env.sh)

```bash
npm install
npm run build:pgljs && npm run build
```

 - install python modules and jupyter extensions

```bash
pip install -e .
jupyter nbextension install --sys-prefix --overwrite --py pgljupyter
jupyter nbextension enable --sys-prefix --py pgljupyter
jupyter labextension install .
jupyter lab clean
```

 - run the lab

```bash
jupyter lab --notebook-dir=./examples
```
