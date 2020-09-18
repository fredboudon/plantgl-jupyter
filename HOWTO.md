# Releasing

## bump version in **all** relevant files:

    - package.json
    - package-lock.json
    - binder/Dockerfile
    - pgljupyter/_frontend.py
    - pgljupyter/_version.py

## merge changes into master and push

## test if npm builds and publish npm pkg

    npm run build:all
    npm publish

## build python pkgs and publish them

    python3 setup.py sdist bdist_wheel
    twine upload dist/*{0.x.xx}*

## tag and check if docker build was succesful

    git tag -a v0.x.xx -m "v0.x.xx"
    git push --tags

## if docker build failed

    - fix docker build
    - delete tag in local and remote:
        git push --delete origin v0.x.xx
        git tag -d v0.x.xx
    - re-tag with the **same** tag you just removed to trigger a new docker build:
        git tag -a v0.x.xx -m "v0.x.xx"
        git push --tags
