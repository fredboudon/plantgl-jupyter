
# pgljupyter

PlantGL jupyter widget

## Installation

You can install using `pip`:

```bash
pip install pgljupyter
```

Or if you use jupyterlab:

```bash
pip install pgljupyter
jupyter labextension install @jupyter-widgets/jupyterlab-manager
```

### dev

```bash
npm run build
```

```bash
pip install -e .
```

jupyter notebook

```bash
jupyter nbextension install --sys-prefix --overwrite --py pgljupyter
jupyter nbextension enable --sys-prefix --py pgljupyter
jupyter notebook --browser=google-chrome
```

jupyter lab

```bash
jupyter labextension install @jupyter-widgets/jupyterlab-manager
jupyter labextension install .
jupyter lab --browser=google-chrome
```
or

```bash
npm run watch
jupyter lab --watch
```
