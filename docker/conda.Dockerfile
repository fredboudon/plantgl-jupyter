FROM emscripten/emsdk:1.39.19 as build
SHELL [ "/bin/bash", "-c" ]
WORKDIR /build
COPY . ./plantgl-jupyter
RUN cd plantgl-jupyter && git submodule update --init --recursive && \
    source /emsdk/emsdk_env.sh && cd src/pgljs && npm install && \
    cd ../..  && npm install && npm run build:pgljs && npm run build

FROM jupyter/base-notebook:lab-2.1.5 AS deploy-deps
WORKDIR /build
USER root
SHELL ["/bin/bash", "-c"]
RUN apt-get update && apt-get install --no-upgrade --no-install-recommends -y libgl1-mesa-dev && \
    apt-get clean && \
    apt-get autoremove -y && \
    rm -rf /var/lib/apt/lists/* && \
    conda install --freeze-installed -y -c fredboudon 'openalea.lpy>=3.4.0' && \
    conda clean -y --all --force-pkgs-dirs

FROM deploy-deps AS deploy
COPY --from=build  /build/plantgl-jupyter /build/plantgl-jupyter
RUN cd /build/plantgl-jupyter && \
    pip3 install . --no-cache && \
    jupyter nbextension install --sys-prefix --overwrite --py pgljupyter && \
    jupyter nbextension enable --sys-prefix --py pgljupyter && \
    jupyter labextension install --no-build @jupyter-widgets/jupyterlab-manager && \
    jupyter labextension install --no-build . && \
    jupyter lab build --minimize=False --dev-build=False && \
    jupyter lab clean && \
    jlpm cache clean && \
    npm cache clean --force && \
    cd / && \
    rm -fr /build && \
    rm -fr /tmp/* && \
    chmod 777 /opt/conda/share/jupyter/lab/settings/build_config.json

# change permisson of
# /opt/conda/share/jupyter/lab/settings/build_config.json

USER 1000
WORKDIR $HOME
ENTRYPOINT []
