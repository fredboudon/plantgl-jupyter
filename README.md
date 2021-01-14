# pgljupyter

[PlantGL](https://github.com/fredboudon/plantgl) & [L-Py](https://github.com/fredboudon/lpy) jupyter widgets

## Quick Examples

- lpy tree model - leuwenberg [@nbviewer](https://nbviewer.jupyter.org/github/jvail/plantgl-jupyter/blob/master/examples/lpy/leuwenberg/leuwenberg.ipynb)

- simple PlantGL shapes - spheres [@nbviewer](https://nbviewer.jupyter.org/github/jvail/plantgl-jupyter/blob/master/examples/spheres.ipynb)

- notebook magics - champignon [@nbviewer](https://nbviewer.jupyter.org/github/jvail/plantgl-jupyter/blob/master/examples/magic_champignon.ipynb)

- notebook magics with scalar parameters - broccoli [@nbviewer](https://nbviewer.jupyter.org/github/jvail/plantgl-jupyter/blob/master/examples/broccoli.ipynb)

- notebook magics with curve parameters - sweep surface [@nbviewer](https://nbviewer.jupyter.org/github/jvail/plantgl-jupyter/blob/master/examples/lpy/sweep_surface/sweep_surface.ipynb)


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
- `--world`, `-w` float: same as `size_world`
- `--unit`, `-u` enum: same as `unit`
- `--params`, `-p` LsystemParameters: name of LsystemParameters instance
- `--animate`, `-a` True: runs animation automatically

**%lpy_plot**

A line magic to plot all derivation steps of an Lsystem on a square plane

```python
# activated by importing pgljupyter
import pgljupyter
```

Arguments:

- `arg0`, string: L-Py file
- `--size`, `-s` int,int: width and hight of the canvas
- `--cell`, `-c` float: size of cell for a single derivation step


## Installation

### Install with pip - inside conda env

Jupyterlab < 3.0 requires nodejs. In case it is not available on your system add `nodejs` to the
`conda create` command.

```bash
conda create -y -n pgl -c fredboudon -c conda-forge \
    openalea.lpy jupyterlab ipywidgets ipython=7
```

For **windows** specify python 3.7 (there are some issues with jupyter on windows with python 3.8)

```bash
conda create -y -n pgl -c fredboudon -c conda-forge python=3.7 \
    openalea.lpy jupyterlab ipywidgets ipython=7
```

Some examples also require `matplotlib` and `rpy2`.

```bash
conda activate pgl
pip install pgljupyter
jupyter labextension install --no-build @jupyter-widgets/jupyterlab-manager
jupyter lab build && jupyter lab
```

### Build, install and run from source

 - install lpy, plantgl, jupyterlab, widgets and widgetsextension

```bash
conda create -y -n pgl -c fredboudon -c conda-forge openalea.lpy jupyterlab ipywidgets
conda activate pgl
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
npm run build:all
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

Run jupyter as docker container locally. Replace `/examples` with the path to your notebooks.
Tag `latest` might not always be up-to-date since docker is primarily used for binder

```
docker pull jvail/plantgl-jupyter:0.2.1
docker run --rm \
    -p 8888:8888 \
    -v $PWD/examples:/home/jovyan/work jvail/plantgl-jupyter:0.2.1 \
    jupyter lab
```
