FROM python:3.8.6
WORKDIR /main

COPY requirements.txt requirements.txt
COPY lidar/*.py src/
CMD ["python3", "pipeline.py"]