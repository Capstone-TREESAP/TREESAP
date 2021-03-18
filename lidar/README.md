CEDAR-lidar
---
# Build package in docker

1. Install Docker: https://docs.docker.com/get-docker/
2. Install Docker compose: https://docs.docker.com/compose/install/ (for server)

### Build docker image
```bash
cd lidar # Go to where Dockerfile is 
docker build --tag lidar . # build the image
 docker run --rm -it --entrypoint bash lidar 
```
# Build package locally

### Install poetry
1. install Python poetry: https://python-poetry.org/docs/#installation
2. make sure your local python version is `3.8.6`. I recommand use `pyenv` to set up a local python version.
```bash
cd CEDAR/lidar
poetry install --no-dev # install just the package for running (recommended)
poetry install # install all packages
```
### Export requirement.txt
```bash
poetry export -f requirements.txt --output requirements.txt --without-hashes
```
Once all the packages are fixed, export poetry package list to `requirements.txt` for docker to build with. 

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