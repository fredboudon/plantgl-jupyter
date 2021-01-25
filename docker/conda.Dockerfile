FROM jupyter/base-notebook:lab-3.x.x
USER root
SHELL ["/bin/bash", "-c"]
RUN apt-get update && apt-get install --no-upgrade --no-install-recommends -y libgl1-mesa-dev && \
    apt-get clean && \
    apt-get autoremove -y && \
    rm -rf /var/lib/apt/lists/* && \
    conda install -y -c fredboudon -c conda-forge 'openalea.lpy>=3.6.0' 'ipywidgets>=7.5.0' 'ipython>=7.0.0' pandas matplotlib rpy2 && \
    jupyter labextension install --no-build @jupyter-widgets/jupyterlab-manager && \
    pip3 install pgljupyter --no-cache && \
    jupyter lab build && \
    conda clean -y --all --force-pkgs-dirs && \
    jupyter lab clean && \
    jlpm cache clean && \
    npm cache clean --force && \
    rm -fr /tmp/*

USER 1000
WORKDIR $HOME
# RUN rm -fr work
ENTRYPOINT []
