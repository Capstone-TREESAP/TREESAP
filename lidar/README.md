CEDAR-lidar
---

# Build package in docker

1. Install Docker: https://docs.docker.com/get-docker/
2. Install Docker compose: https://docs.docker.com/compose/install/ (for server)

## Build docker image
on the host machine run this command before initiate docker
```bash
xhost +local:docker
```

```bash
cd lidar # Go to where Dockerfile is 
docker build --tag lidar . # build the image
```

## Run docker image
### Start image by default
```bash
sudo docker run --rm -it --net=host --env="DISPLAY" --volume="$HOME/.Xauthority:/root/.Xauthority:rw" --device /dev/dri/ --security-opt seccomp=./docker/chrome.json --privileged lidar
```
Docker will start the pipeline GUI.
> the plot is a little laggy, due to the number of points loaded into the plot and some optimization problem with PyQt5.

### Start image interactively
```bash
sudo docker run --rm -it --net=host --env="DISPLAY" --volume="$HOME/.Xauthority:/root/.Xauthority:rw" --device /dev/dri/ --security-opt seccomp=./docker/chrome.json --privileged lidar /bin/bash

# in docker bash
conda activate lidar-raw
```
The docker image's purpose is a testing framework for parameter tuning. If you would like to apply it to the whole campus, you will have to create a volume for the docker to load the data files. 

# Build package in Ubuntu

## Installation

1. Install Conda 4.9.2 (python 3.8.8): https://conda.io/projects/conda/en/latest/user-guide/install/index.html
2. Create conda environment with `conda env create -n lidar-raw -f environment. yml`
3. Activate the environment: `conda activate lidar-raw`

All the following commands assume that the environment has been activated. 

> Note that the environment can be really big. For a reference, mine is about 5.0G

## Download las files 

To download the City of Vancouver dataset:
```bash
cd CEDAR/lidar/lidar 
python download.py  
```
> Note that the dataset will take a long time, and a lot of storage to download. For example, the 2018 dataset is about 12.8G, took more than 5 minutes to download.

## Run pipeline

> If you are using docker, first run the interactive shell. The root directory in docker is `/src` instead of `CEDER/lidar`
```bash
cd CEDAR/lidar/lidar # cd src in docker
python pipeline.py
``` 

a [map.geojson](lidar/../tests/map.geojson) will be generated at the end of processing under `lidar/tests`. 

> See python pipeline.py --help for details with arguments. 

# Document 

```bash
cd CEDAR/lidar 
doxygen doxygen.conf
```
See documentation at `CEDAR/lidar/docs/html/index.html`

# Additional documents

[Detailed instructions on GUI](./resource/GUI.md)

[Unlabelled LiDAR segmentation](./resource/SEGMENTATION.md)

[Sample whole campus output](../lidar/tests/sample_map.geojson)



