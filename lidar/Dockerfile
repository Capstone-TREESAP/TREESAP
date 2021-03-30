FROM ubuntu:20.04
RUN apt-get update && apt-get -y upgrade\
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

ENV PROJECT_DIR /main
RUN mkdir $PROJECT_DIR
WORKDIR $PROJECT_DIR

# build the conda environment
ENV ENV_PREFIX $PWD/env
RUN conda update --name base --channel defaults conda && \
    conda env create --prefix $ENV_PREFIX --file /tmp/environment.yml --force && \
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

# COPY lidar/*.py src/
# CMD ["python3", "pipeline.py"]