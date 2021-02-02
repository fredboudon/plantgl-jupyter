# Releasing

## bump version in **all** relevant files:

    - package.json
    - package-lock.json
    - binder/Dockerfile
    - pgljupyter/_frontend.py
    - pgljupyter/_version.py

## test if npm builds and publish npm pkg

    npm run clean
    npm run build:all
    npm publish

## build python pkgs and publish them

    Check that there are not multiple versions in dist/ that will be published, packed together

    npm run clean
    python3 setup.py sdist bdist_wheel
    twine upload dist/*{0.x.xx}*

## merge changes into master and push

## tag and check if docker build was successful

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
