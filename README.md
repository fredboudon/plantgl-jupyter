# pgljupyter

[PlantGL](https://github.com/fredboudon/plantgl) & [L-Py](https://github.com/fredboudon/lpy) jupyter widgets

## Quick Examples

- notebook magics - champignon [@nbviewer](https://nbviewer.jupyter.org/github/jvail/plantgl-jupyter/blob/master/examples/magic_champignon.ipynb)

- simple shapes - spheres [@nbviewer](https://nbviewer.jupyter.org/github/jvail/plantgl-jupyter/blob/master/examples/spheres.ipynb)

- lpy tree model - leuwenberg [@binder](https://mybinder.org/v2/gh/jvail/plantgl-jupyter/master?urlpath=lab/tree/examples/lpy/leuwenberg/leuwenberg.ipynb)


## Usage

```python
from pgljupyter import SceneWidget, LsystemWidget
```

**SceneWidget**

Renderer for PlantGL Scenes, Shapes, Geometries

Arguments:

- `arg0` list | plantgl.Shape | plantgl.Scene: a list of shapes or scenes or a single object
- `position` tuple (float, float, float): x, y, z position of arg0 (default (0, 0, 0))
- `scale` float: scale factor for arg0 (default 1)
- `size_display` tuple (int, int): width and height of the canvas (minimum 400)
- `size_world` float: extend on the 3D scene in all directions


**LsystemWidget**

Renderer for lpy.Lstrings derived from lpy.Lsystem code

Arguments:

- `arg0` string: file name / path of lpy code file
- `unit` string enum: the unit used in the Lsystem model ('m', 'dm', 'cm', 'mm', default 'm')
- `scale` float: scale factor for arg0 (default 1)
- `animate` bool: if `True` runs animation automatically
- `size_display` tuple (int, int): width and height of the canvas (minimum 400)
- `size_world` float: extend on the 3D scene in all directions


**%%lpy**

A cell magic to inline L-Py code in a notebook

```python
# activated by importing pgljupyter
import pgljupyter
```

Arguments:

- `--size`, `-s` int,int: same as `size_display`
- `--unit`, `-u` enum: same as `unit`
- `--world`, `-w` float: same as `size_world`
- `--animate`, `-a` True: runs animation automatically


## Installation

### Install with pip - inside conda env

```bash
conda create -y -n pgljupyter -c fredboudon -c conda-forge \
    'openalea.lpy>=3.4.0' 'jupyterlab>=2.2.0' 'ipywidgets>=7.5.0'
conda activate pgljupyter
pip install pgljupyter
jupyter labextension install --no-build @jupyter-widgets/jupyterlab-manager
jupyter lab build && jupyter lab
```

### Build, install and run from source

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

## Docker

Run jupyter as docker container locally.
Tag `latest` might not always be up-to-date since docker is primarily used for binder

```
docker pull jvail/plantgl-jupyter:0.1.19
docker run --rm \
    -p 8888:8888 \
    -v $PWD/{folder_with_your_notebooks}:/home/jovyan/work plantgl-jupyter \
    jupyter lab`
```
