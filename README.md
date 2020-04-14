
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
pip install -e .
```
jupyter notebook

```bash
jupyter nbextension install --sys-prefix --overwrite --py pgljupyter
```
jupyter lab

```bash
jupyter labextension install .
```
