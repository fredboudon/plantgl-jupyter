cd /ifb/data/mydatalocal && \
conda install -y -c fredboudon -c conda-forge openalea.lpy toml future rpy2 && \
pip install git+https://github.com/fredboudon/deploy.git && \
pip install git+https://github.com/fredboudon/mtg.git && \
jupyter labextension install --no-build @jupyter-widgets/jupyterlab-manager && \
pip install pgljupyter && \
jupyter lab build && \
git clone https://github.com/jvail/vmango.git && \
python vmango/setup.py develop
