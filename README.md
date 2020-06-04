
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

### docker

```bash
docker build --build-arg USER_ID=$(id -u) --target jupyter --rm -f "docker/Dockerfile" \
    -t plantgljupyter:latest --network=host .

docker run -it --rm --network host -v $PWD:/home/user/plantgljupyter --user $(id -u):$(id -g) \
    -e "NOTEBOOK_DIR=plantgljupyter/examples" plantgljupyter:latest
```

docker build --rm -f "docker/prod.Dockerfile" -t plantgljupyter:dev --network=host .

docker run -it --rm -p 8080:8080 -v $PWD/examples:/home/user/examples jvail/plantgl-jupyter:1a jupyter lab --port=8080 --allow-root --ip=0.0.0.0 --notebook-dir=/home/user/examples
