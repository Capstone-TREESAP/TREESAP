FROM ubuntu:20.04
WORKDIR /main

#  Install packages
RUN apt-get update; apt-get -y upgrade
RUN apt-get -y install software-properties-common
RUN add-apt-repository ppa:deadsnakes/ppa
RUN apt-get -y install python3.8 python3-pip
# set up codebase
COPY requirements.txt requirements.txt
RUN pip3 install -r requirements.txt

COPY lidar/*.py src/
CMD ["python3", "pipeline.py"]