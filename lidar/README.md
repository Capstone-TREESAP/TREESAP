CEDAR-lidar
---

# Build  

## With docker

### Install docker 

### Build docker image
```bash 
```


## Install packages as dev

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
> Note that the dataset will take a long time, and a lot of storage to download. For example, the 2018 dataset is 12.8G, took 5 minutes to download. 

# Run

```bash
cd CEDAR/lidar/lidar
poetry run python pipeline.py
``` 

a `map.geojson` and `tile.geojson` will be generated at the end of processing. 

# Document 

```bash
cd CEDAR/lidar 
doxygen doxygen.conf
```

See documentation at `CEDAR/lidar/docs/html/index.html`