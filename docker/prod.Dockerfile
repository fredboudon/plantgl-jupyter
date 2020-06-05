# TODO: reduce image size. removing build dir does not work. It seems pip does not copy the so files properly and python looks for so files in the source tree
FROM plantgl-jupyter-build AS plantgl-jupyter
WORKDIR /
RUN rm -fr /build
