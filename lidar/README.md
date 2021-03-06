CEDAR-lidar
---

# Build  

1. install Python poetry: https://python-poetry.org/docs/#installation
2. make sure your local python version is `3.8.6`. I recommand use `pyenv` to set up a local python version.
```bash
cd CEDAR/lidar
poetry install --no-dev # install just the package for running (recommended)
poetry install # install all packages
```

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