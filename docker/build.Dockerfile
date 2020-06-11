FROM node:12-buster-slim AS base

WORKDIR /build

RUN apt-get update && apt-get install -y git build-essential cmake \
    sudo r-base libboost-all-dev python3-dev libboost-python-dev python3-pip python3-pyqt5  pyqt5-dev-tools \
    zlib1g-dev libpng-dev libjpeg-dev libbz2-dev \
    libgl-dev libglu1-mesa libglu1-mesa-dev libgl1-mesa-dev libgl1-mesa-glx libgl1-mesa-dri freeglut3-dev \
    libqt5opengl5 qtbase5-dev libqt5x11extras5-dev libqhull-dev libcgal-dev libann-dev bison libeigen3-dev libfl-dev && \
    apt-get clean
RUN git clone  https://github.com/google/draco.git  && cd draco \
    git checkout tags/1.3.6  && \
    mkdir build && cd build && cmake -DBUILD_SHARED_LIBS=ON ../ && make -j4 && make install

FROM base as py_stuff
RUN pip3 install --no-cache-dir setuptools && \
    pip3 install --no-cache-dir rpy2 toml matplotlib pandas future qtconsole numpy jupyter jupyterlab && \
    jupyter labextension install --no-build @jupyter-widgets/jupyterlab-manager

FROM py_stuff AS r_stuff
RUN apt-get install -y r-base r-cran-vgam r-cran-multcomp r-cran-combinat && \
    apt-get clean

FROM r_stuff AS oa_stuff
RUN pip3 install --no-cache-dir git+https://github.com/fredboudon/deploy.git --user && \
    pip3 install --no-cache-dir git+https://github.com/fredboudon/mtg.git

FROM oa_stuff as plantgl
ENV PREFIX /usr/local
RUN git clone  https://github.com/jvail/plantgl.git  && cd plantgl && \
    git checkout plantgl-jupyter && \
    mkdir build && cd build && cmake -DCMAKE_INSTALL_PREFIX=/usr/local -DCMAKE_BUILD_TYPE=Release ../ && \
    make -j4 && make install && \
    cd .. && pip3 install . --system

FROM plantgl as lpy
ENV PREFIX /usr/local
RUN git clone https://github.com/jvail/lpy.git && cd lpy && \
    git checkout plantgl-jupyter && \
    mkdir build && cd build && cmake -DCMAKE_INSTALL_PREFIX=/usr/local -DCMAKE_BUILD_TYPE=Release -DPLANTGL_ROOT=../plantgl/build-cmake ../ -DBOOST_INCLUDEDIR=/usr/include/boost && \
    make -j4 && make install && \
    cd .. && pip3 install . --system

FROM lpy as plantgl-jupyter-build
RUN git clone https://github.com/jvail/plantgl-jupyter.git && cd plantgl-jupyter && \
    npm install && npm run build && \
    pip3 install . --system && \
    jupyter nbextension install --overwrite --py pgljupyter && \
    jupyter nbextension enable --py pgljupyter && \
    jupyter labextension install --dev-build=False . && \
    jupyter lab clean && \
    rm -fr /usr/local/share/.cache
WORKDIR /
RUN rm -fr /tmp
ENTRYPOINT []
