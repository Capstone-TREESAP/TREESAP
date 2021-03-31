CEDAR-lidar
---
# Build package in docker

1. Install Docker: https://docs.docker.com/get-docker/
2. Install Docker compose: https://docs.docker.com/compose/install/ (for server)

### Build docker image
```bash
cd lidar # Go to where Dockerfile is 
docker build --tag lidar . # build the image
docker run --rm -it --env="DISPLAY" lidar 
docker run --rm -it --net=host --env="DISPLAY" --volume="$HOME/.Xauthority:/root/.Xauthority:rw" -e QTWEBENGINE_ENABLE_LINUX_ACCESSIBILITY=1 --entrypoint 

sudo docker run --rm -it --net=host --env="DISPLAY" --volume="$HOME/.Xauthority:/root/.Xauthority:rw" --device /dev/dri/ --security-opt seccomp=./docker/chrome.json --privileged lidar

# on the host
xhost +local:docker
```

### Download las files 

To download the City of Vancouver dataset:
```bash
cd CEDAR/lidar/lidar 
poetry run python download.py  
```
> Note that the dataset will take a long time, and a lot of storage to download. For example, the 2018 dataset is about 12.8G, took more than 5 minutes to download. 

# Run

> If you are using docker, first run the interactive shell. The root directory in docker is `/src` instead of `CEDER/lidar`
```bash
cd CEDAR/lidar/lidar # cd src in docker
poetry run python pipeline.py
``` 

a `map.geojson` will be generated at the end of processing under `lidar/tests`

# Document 

```bash
cd CEDAR/lidar 
doxygen doxygen.conf
```

See documentation at `CEDAR/lidar/docs/html/index.html`