import json
from download import download_lidar_dataset, unzip_files
from config import configure

download_lidar_dataset(configure.get("Download", "dest_dir_path"), json.loads(configure.get("Download", "tiles")))
unzip_files(configure.get("Download", "dest_dir_path"))
