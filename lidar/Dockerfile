FROM ubuntu:20.04

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update \
    && apt-get -y upgrade \
    && apt-get install -y ffmpeg libsm6 libxext6 \
    && apt-get install -y libxcomposite-dev libxtst6 libpci-dev \
    && apt-get install -y wget
SHELL [ "/bin/bash", "--login", "-c" ]
# Create a non-root user

COPY environment.yml requirements.txt /tmp/

COPY docker/entrypoint.sh /usr/local/bin/

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

ENV PROJECT_DIR /home
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

#  Install packages
# RUN apt-get update; apt-get -y upgrade
# RUN apt-get -y install software-properties-common
# RUN add-apt-repository ppa:deadsnakes/ppa
# RUN apt-get -y install python3.8 python3-pip
# # set up codebase
# COPY requirements.txt requirements.txt
# RUN pip3 install -r requirements.txt

COPY lidar/*.py src/
COPY pipeline.ui .
RUN mkdir -r tests/test_data
COPY lidar/config src/config

WORKDIR $PROJECT_DIR/src
CMD ["python", "qt_gui.py"]