import requests
import os
import zipfile

SRC_URL = "https://webtransfer.vancouver.ca/opendata/2018LiDAR/"

DST_DATA = "../data/2018/"

ZIP_EXT = ".zip"

TILE = ["4800E_54550N", "4800E_54560N", "4800E_54570N", 
        "4810E_54540N", "4810E_54550N", "4810E_54560N", "4810E_54570N", "4810E_54580N",
        "4820E_54530N", "4820E_54540N", "4820E_54550N", "4820E_54560N", "4820E_54570N", "4820E_54580N"];

print('Beginning file download with urllib2...')

def download_lidar_dataset():
    for tile in TILE:
        src_url = SRC_URL + tile + ZIP_EXT
        dst_file = DST_DATA + tile + ZIP_EXT
        print("Downloading %s ..." % (SRC_URL + tile + ZIP_EXT))
        # download_url(src_url, dst_file)
def download_url(url, save_path, chunk_size=128):
    r = requests.get(url, stream=True)
    with open(save_path, 'wb') as fd:
        for chunk in r.iter_content(chunk_size=chunk_size):
            fd.write(chunk)

def unzip_files(src_dir):
    for root, dirs, files in os.walk(src_dir):
        for file in files:
            if file.endswith(ZIP_EXT):
                print("Extracting " + os.path.join(root, file))
                with zipfile.ZipFile(os.path.join(root, file), 'r') as zip_ref:
                    zip_ref.extractall(src_dir)
                    
download_lidar_dataset()
unzip_files(DST_DATA)