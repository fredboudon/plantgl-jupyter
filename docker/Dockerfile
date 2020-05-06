FROM node:buster-slim AS base

ARG USER_ID

RUN echo "root:root" | chpasswd && \
    groupadd -g ${USER_ID} user && \
    adduser --quiet --uid ${USER_ID} --gid ${USER_ID} user
# -p $(openssl passwd -1 "user")
WORKDIR /build

RUN apt-get update && apt-get install -y  git build-essential cmake \
    sudo python libboost-all-dev python-dev libboost-python-dev python3-pip python3-pyqt5  pyqt5-dev-tools \
    zlib1g-dev libpng-dev libjpeg-dev libbz2-dev \
    libgl-dev libglu1-mesa libglu1-mesa-dev libgl1-mesa-dev libgl1-mesa-glx libgl1-mesa-dri freeglut3-dev \
    qtbase5-dev libqt5x11extras5-dev libqhull-dev libcgal-dev libann-dev bison libeigen3-dev flex

FROM base as draco
RUN git clone  https://github.com/google/draco.git  && cd draco \
    git checkout tags/1.3.6  && \
    mkdir build && cd build && cmake -DBUILD_SHARED_LIBS=ON ../ && make -j4 && make install

FROM draco as plantgl
RUN pip3 install git+https://github.com/fredboudon/deploy.git --user
RUN pip3 install git+https://github.com/fredboudon/mtg.git toml matplotlib pandas future qtconsole numpy jupyter jupyterlab && jupyter labextension install --no-build @jupyter-widgets/jupyterlab-manager
RUN git clone  https://github.com/jvail/plantgl.git  && cd plantgl && \
    git checkout plantgl-jupyter && \
    mkdir build && cd build && cmake -DCMAKE_BUILD_TYPE=Release ../ && \
    make -j4 && make install && \
    cd .. && pip3 install .

FROM plantgl as lpy
RUN git clone https://github.com/jvail/lpy.git && cd lpy && \
    git checkout plantgl-jupyter && \
    mkdir build && cd build && cmake -DCMAKE_BUILD_TYPE=Release -DPLANTGL_ROOT=../plantgl/build-cmake ../ -DBOOST_INCLUDEDIR=/usr/include/boost && \
    make -j4 && make install && \
    cd .. && pip3 install .

FROM lpy as plantgl-jupyter
WORKDIR /pgljupyter
COPY ./ .
RUN pip3 install -e . && \
    jupyter nbextension install --sys-prefix --overwrite --py pgljupyter && \
    jupyter nbextension enable --sys-prefix --py pgljupyter && \
    jupyter labextension install . && \
    python3 -m ipykernel install --name pgl-jupyter

FROM plantgl-jupyter as jupyter
USER user
WORKDIR /home/user
CMD jupyter lab --notebook-dir=$NOTEBOOK_DIR
