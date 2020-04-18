FROM debian:latest AS base
WORKDIR /build

RUN apt-get update && apt-get install -y  git build-essential cmake \
    python libboost-all-dev python-dev libboost-python-dev python3-pip python3-pyqt5  pyqt5-dev-tools \
    zlib1g-dev libpng-dev libjpeg-dev \
    libgl-dev libglu1-mesa libglu1-mesa-dev libgl1-mesa-dev libgl1-mesa-glx libgl1-mesa-dri freeglut3-dev \
    qtbase5-dev libqt5x11extras5-dev libqhull-dev libcgal-dev libann-dev bison libeigen3-dev flex \
    nodejs npm

FROM base as draco
RUN git clone  https://github.com/google/draco.git  && cd draco \
    git checkout tags/1.3.6  && \
    mkdir build && cd build && cmake -DBUILD_SHARED_LIBS=ON ../ && make -j4 && make install

FROM draco as plantgl
RUN git clone  https://github.com/jvail/plantgl.git  && cd plantgl && \
    git checkout plantgl-jupyter && \
    mkdir build && cd build && cmake -DCMAKE_BUILD_TYPE=Release ../ && \
    make -j4 && make install && \
    cd .. && pip3 install -e .

FROM plantgl as lpy
RUN pip3 install git+https://github.com/fredboudon/deploy.git
RUN git clone  https://github.com/fredboudon/lpy.git && cd lpy && \
    sed -i 's/set(Boost_NO_SYSTEM_PATHS ON)/set(Boost_NO_SYSTEM_PATHS OFF)/g' CMakeLists.txt && \
    mkdir build && cd build && cmake -DCMAKE_BUILD_TYPE=Release -DPLANTGL_ROOT=../plantgl/build-cmake ../ -DBOOST_INCLUDEDIR=/usr/include/boost && \
    make -j4 && make install && \
    cd .. && python3 setup.py develop

FROM lpy as jupyter
RUN pip3 install git+https://github.com/fredboudon/mtg.git qtconsole numpy jupyter jupyterlab && jupyter labextension install --no-build @jupyter-widgets/jupyterlab-manager

FROM jupyter as plantgl-jupyter
WORKDIR /jupyter
COPY ./ .
RUN pip3 install -e . && jupyter labextension install --clean --dev-build=False .

CMD jupyter lab --notebook-dir=examples --allow-root
