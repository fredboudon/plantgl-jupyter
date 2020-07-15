docker build --rm -f "docker/conda.Dockerfile" -t plantgl-jupyter:conda --network=host .
docker run --rm -p 8888:8888  plantgl-jupyter:conda jupyter lab
