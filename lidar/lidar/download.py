import requests
import os
import zipfile
from config import configure


def download_lidar_dataset(dir_path, tile_list):
    """Download City of Vancouver LiDAR data"""
    print("Beginning file download with urllib2...")
    for tile in tile_list:
        src_url = (
            configure.get("Test", "src_url")
            + tile
            + configure.get("Constants", "zip_ext")
        )
        dst_file = dir_path + tile + configure.get("Constants", "zip_ext")
        print(
            "Downloading %s ..."
            % (
                configure.get("Test", "src_url")
                + tile
                + configure.get("Constants", "zip_ext")
            )
        )
        download_url(src_url, dst_file)


def download_url(url, save_path, chunk_size=128):
    """Download files from given URL

    Args:
        url (string): source URL
        save_path (string): file path to save to
        chunk_size (int, optional): the base chunk of data size. Defaults to 128.
    """
    r = requests.get(url, stream=True)
    with open(save_path, "wb") as fd:
        for chunk in r.iter_content(chunk_size=chunk_size):
            fd.write(chunk)


def unzip_files(src_dir):
    """Unzip files and then remove the zip files.

    Args:
        src_dir (string): source directory
    """
    for root, dirs, files in os.walk(src_dir):
        for file in files:
            if file.endswith(configure.get("Constants", "zip_ext")):
                print("Extracting " + os.path.join(root, file))
                with zipfile.ZipFile(os.path.join(root, file), "r") as zip_ref:
                    zip_ref.extractall(src_dir)
                os.remove(os.path.join(root, file))

