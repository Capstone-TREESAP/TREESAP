FROM ubuntu:20.04

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update \
    && apt-get -y upgrade \
    && apt-get install -y ffmpeg libsm6 libxext6 \
    && apt-get install -y libxcomposite-dev libxtst6 libpci-dev \
    && apt-get install -y wget

SHELL [ "/bin/bash", "--login", "-c" ]
# Create a non-root user
ARG username=jarjarbinks
ARG uid=1000
ARG gid=100
ENV USER $username
ENV UID $uid
ENV GID $gid
ENV HOME /home/$USER
RUN adduser --disabled-password \
    --gecos "Non-root user" \
    --uid $UID \
    --gid $GID \
    --home $HOME \
    $USER

COPY environment.yml requirements.txt /tmp/
RUN chown $UID:$GID /tmp/environment.yml /tmp/requirements.txt

COPY docker/entrypoint.sh /usr/local/bin/
RUN chown $UID:$GID /usr/local/bin/entrypoint.sh && \
    chmod u+x /usr/local/bin/entrypoint.sh

USER $USER

# install miniconda
ENV MINICONDA_VERSION latest
ENV CONDA_DIR ~/miniconda3
RUN wget --quiet https://repo.anaconda.com/miniconda/Miniconda3-$MINICONDA_VERSION-Linux-x86_64.sh -O ~/miniconda.sh && \
    chmod +x ~/miniconda.sh && \
    ~/miniconda.sh -b -p $CONDA_DIR && \
    rm ~/miniconda.sh
# make non-activate conda commands available
ENV PATH=$CONDA_DIR/bin:$PATH
# make conda activate command available from /bin/bash --login shells
RUN echo ". $CONDA_DIR/etc/profile.d/conda.sh" >> ~/.profile
# make conda activate command available from /bin/bash --interative shells
RUN conda init bash

ENV PROJECT_DIR $HOME
WORKDIR $PROJECT_DIR

# build the conda environment
ENV ENV_PREFIX lidar-raw
RUN conda env create -f /tmp/environment.yml && \
    conda clean --all --yes
# run the postBuild script to install any JupyterLab extensions
# RUN conda activate $ENV_PREFIX && \
#     /usr/local/bin/postBuild.sh && \
#     conda deactivate

ENTRYPOINT [ "/usr/local/bin/entrypoint.sh" ]

COPY --chown=$UID:$GID lidar/*.py src/

COPY --chown=$UID:$GID pipeline.ui .
RUN mkdir -p tests/test_data
RUN chown -R $UID:$GID tests

# copy over some sample data
COPY --chown=$UID:$GID lidar/configs/default_config.ini src/configs/default_config.ini 
COPY --chown=$UID:$GID tests/test_data/481E_5456N_tiny.png data/481E_5456N_tiny.png
COPY --chown=$UID:$GID tests/test_data/sample_plot.html data/sample_plot.html

WORKDIR $PROJECT_DIR/src
CMD ["python", "qt_gui.py"]