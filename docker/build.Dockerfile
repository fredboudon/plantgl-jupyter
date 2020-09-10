FROM node:12-buster AS base

WORKDIR /build

RUN apt-get update && apt-get install -y git build-essential cmake \
    sudo r-base libboost-all-dev python3-dev libboost-python-dev python3-pip python3-pyqt5  pyqt5-dev-tools \
    zlib1g-dev libpng-dev libjpeg-dev libbz2-dev \
    libgl-dev libglu1-mesa libglu1-mesa-dev libgl1-mesa-dev libgl1-mesa-glx libgl1-mesa-dri freeglut3-dev \
    libqt5opengl5 qtbase5-dev libqt5x11extras5-dev libqhull-dev libcgal-dev libann-dev bison libeigen3-dev libfl-dev && \
    git clone  https://github.com/google/draco.git  && cd draco \
    git checkout tags/1.3.6  && \
    mkdir build && cd build && cmake -DBUILD_SHARED_LIBS=ON -DCMAKE_INSTALL_PREFIX=/opt ../ && make -j4 &&  make install && \
    git clone https://github.com/emscripten-core/emsdk.git && \
    cd emsdk && ./emsdk install latest && ./emsdk activate latest

# FROM base AS r
# RUN apt-get install -y r-base r-cran-vgam r-cran-multcomp r-cran-combinat && \
#     apt-get clean

FROM base AS oa
RUN git clone https://github.com/fredboudon/deploy.git && \
    git clone https://github.com/fredboudon/mtg.git

FROM oa as plantgl
ENV PREFIX /opt
RUN git clone  https://github.com/fredboudon/plantgl.git  && cd plantgl && \
    sed -i '/set(Boost_NO_SYSTEM_PATHS ON)/c\set(Boost_NO_SYSTEM_PATHS OFF)' CMakeLists.txt && \
    mkdir build && cd build && cmake -DCMAKE_INSTALL_PREFIX=/opt -DCMAKE_BUILD_TYPE=Release ../ && \
    make -j4 && make install

FROM plantgl as lpy
ENV PREFIX /opt
RUN git clone https://github.com/fredboudon/lpy.git && cd lpy && \
    sed -i '/set(Boost_NO_SYSTEM_PATHS ON)/c\set(Boost_NO_SYSTEM_PATHS OFF)' CMakeLists.txt && \
    mkdir build && cd build && cmake -DCMAKE_INSTALL_PREFIX=/opt -DCMAKE_BUILD_TYPE=Release -DPLANTGL_ROOT=/opt/plantgl ../ -DBOOST_INCLUDEDIR=/usr/include/boost && \
    make -j4 && make install

FROM lpy as pgljupyter
SHELL ["/bin/bash", "-c"]
RUN git clone https://github.com/jvail/plantgl-jupyter.git && cd plantgl-jupyter && \
    git checkout bgeom-viewer && cd src/pgljs && npm install && cp -a /build/plantgl/* ./plantgl && cd ../.. && \
    source /build/emsdk/emsdk_env.sh && npm install && npm run build:pgljs && npm run build

FROM python:3.7.8-slim-buster as py
COPY --from=pgljupyter /build /build
COPY --from=pgljupyter /opt /opt
RUN apt-get update && apt-get install --no-install-recommends -y libboost-all-dev

FROM py as deploy
ENV PREFIX /opt
RUN pip3 install --no-cache-dir toml matplotlib pandas future qtconsole numpy jupyter jupyterlab && \
    jupyter labextension install --no-build @jupyter-widgets/jupyterlab-manager && \
    cd /build/deploy && pip3 install . && \
    cd /build/mtg && pip3 install . && \
    cd /build/plantgl && pip3 install . && \
    cd /build/lpy && pip3 install . && \
    cd /build/plantgl-jupyter && pip3 install . && \
    jupyter nbextension install --overwrite --py pgljupyter && \
    jupyter nbextension enable --py pgljupyter && \
    jupyter labextension install --dev-build=False .

WORKDIR /
ENTRYPOINT []
