FROM emscripten/emsdk:1.39.19 as build
SHELL [ "/bin/bash", "-c" ]
WORKDIR /build
COPY . ./plantgl-jupyter
RUN source /emsdk/emsdk_env.sh && cd ./plantgl-jupyter/src/pgljs && npm install && \
    rm -fr plantgl build && git clone  https://github.com/fredboudon/plantgl.git  && \
    cd ../..  && npm install && npm run build:pgljs && npm run build


FROM jupyter/base-notebook:lab-2.1.5 AS deploy-deps

USER root
RUN apt update && apt install --no-install-recommends -y libgl1-mesa-dev && \
    conda install -y -c fredboudon openalea.lpy

FROM deploy-deps AS deploy

USER root
SHELL ["/bin/bash", "-c"]
COPY --from=build  /build/plantgl-jupyter /build/plantgl-jupyter
RUN cd /build/plantgl-jupyter && \
    pip3 install . && \
    jupyter nbextension install --sys-prefix --overwrite --py pgljupyter && \
    jupyter nbextension enable --sys-prefix --py pgljupyter && \
    jupyter labextension install --no-build @jupyter-widgets/jupyterlab-manager && \
    jupyter labextension install . --minimize=False --dev-build=False && \
    jupyter lab clean && rm -fr /build/plantgl-jupyter

USER 1000
WORKDIR $HOME
ENTRYPOINT []
