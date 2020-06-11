FROM plantgl-jupyter:build AS plantgl-jupyter-dev
ARG USER_ID=1000
RUN echo "root:root" | chpasswd && \
    groupadd -g ${USER_ID} user && \
    useradd --create-home --shell /bin/bash --uid ${USER_ID} --gid ${USER_ID} user && \
    echo "user:user" | chpasswd && \
    adduser user sudo && \
    chsh -s /bin/bash root
USER ${USER_ID}
WORKDIR /home/user
