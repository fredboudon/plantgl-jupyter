FROM jupyter/base-notebook:lab-2.1.5
USER root
SHELL ["/bin/bash", "-c"]
RUN apt-get update && apt-get install --no-upgrade --no-install-recommends -y libgl1-mesa-dev && \
    apt-get clean && \
    apt-get autoremove -y && \
    rm -rf /var/lib/apt/lists/* && \
    conda update -y jupyterlab && \
    conda install --freeze-installed -y -c fredboudon -c conda-forge openalea.lpy openalea.plantgl && \
    jupyter labextension install --no-build @jupyter-widgets/jupyterlab-manager && \
    pip3 install pgljupyter --no-cache && \
    jupyter lab build && \
    conda clean -y --all --force-pkgs-dirs && \
    jupyter lab clean && \
    jlpm cache clean && \
    npm cache clean --force && \
    cd / && \
    rm -fr /build && \
    rm -fr /tmp/* && \
    chmod 777 /opt/conda/share/jupyter/lab/settings/build_config.json

USER 1000
WORKDIR $HOME
ENTRYPOINT []
