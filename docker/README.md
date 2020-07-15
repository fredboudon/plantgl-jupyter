just some snippets ..

docker build --rm -f "docker/conda.Dockerfile" -t plantgl-jupyter:conda --network=host .
docker run --rm -p 8888:8888  plantgl-jupyter:conda jupyter lab

docker build --rm -f "docker/build.Dockerfile" -t plantgl-jupyter:build --network=host .


docker build --rm -f "docker/build.Dockerfile" -t plantgl-jupyter:build --network=host .

docker run -it --rm -p 8080:8080 -v $PWD/examples:/examples plantgl-jupyter:build jupyter lab --port=8080 --allow-root --ip=0.0.0.0 --notebook-dir=/examples
