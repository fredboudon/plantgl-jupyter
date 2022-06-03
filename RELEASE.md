## Manual release

This extension can be distributed as Python packages. All of the Python packaging instructions in the `pyproject.toml` file to wrap your extension in a Python package. Before generating a package, we first need to install `build`.

```bash
pip install build twine
```

## Bump version in **all** relevant files

- package.json
- package-lock.json
- pgljupyter/_frontend.py
- pgljupyter/_version.py


## Update README

- version
- API spec
- descriptions

## Commit all changes in branch develop

## Build python pkgs and publish them

Activate conda dev env and emsdk e.g.

```bash
conda activate pgljupyter-dev
source ~/emsdk/emsdk_env.sh
```
You need build and twine installed. To create a Python source package (`.tar.gz`) and the binary package (`.whl`) in the `dist/` directory, do:

```bash
npm run build:prod
python -m build
```

Make sure there are no old/oudated files in dist/
Then to upload the package to PyPI, do:

```bash
twine upload dist/pgljupyter-*
```

## Test if npm builds and publish npm pkg

Mainly for tools like nbviewer or vscode that load widgets from the npm package.

```bash
npm login
npm publish
```

## Merge changes into master, tag and push

```bash
git push
git tag -a v{version} -m "v{version}"
git push --tags
```
