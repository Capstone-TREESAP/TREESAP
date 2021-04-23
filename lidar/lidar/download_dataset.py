import json
from download import download_lidar_dataset, unzip_files
from config import configure
from pathlib import Path

Path(configure.get("Download", "dest_dir_path")).mkdir(parents=True, exist_ok=True)
download_lidar_dataset(configure.get("Download", "dest_dir_path"), json.loads(configure.get("Download", "tiles")))
unzip_files(configure.get("Download", "dest_dir_path"))
