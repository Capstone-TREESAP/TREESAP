import os
import ntpath
import fnmatch, re
import numpy as np
from laspy.file import File

MIN_SIZE = 6
LAS_EXT = ".las"

def extract_utm_from_filename(filepath):
    """ Extract the UTM global coordinate from file path

    Args:
        filepath (str): [description]

    Returns:
        [type]: [description]
    """
    filename = ntpath.basename(filepath)
    regex = re.compile(r'\d+')
    east, north = regex.findall(filename)
    return int(east), int(north)

def collect_las_file(dir_path):
    """ 

    Args:
        dir_path ([type]): [description]
    Returns:
        [type]: [description]
    """
    las_file_dict = {}
    for root, dirs, files in os.walk(dir_path):
        for file in files:
            if file.endswith(LAS_EXT):
                filepath = os.path.join(root, file)
                east, north = extract_utm_from_filename(filepath)
                las_file_dict[filepath] = [east, north]
    return las_file_dict

def extract_relative_las_data(filepath, downsize, min_east, min_north):
    """ extract the point cloud data relative to the min tile

    Args:
        filepath ([type]): [description]
        downsize ([type]): [description]
        min_east ([type]): [description]
        min_north ([type]): [description]

    Returns:
        [type]: [description]
    """
    max_size = 100000
    
    inFile = File(filepath, mode='r')

    I = inFile.Classification == 6

    test = inFile.points[I]
    
    n = 200000

    if test.shape[0] == 0:
        print("No trees are classified on the tile")
        return 
    
    sample = np.random.choice(test, n)
    
    x = np.zeros(sample.shape[0])
    y = np.zeros(sample.shape[0])
    z = np.zeros(sample.shape[0])
    for i in np.arange(0, sample.shape[0]):
        x[i] = sample[i][0][0]
        y[i] = sample[i][0][1]
        z[i] = sample[i][0][2]

    east, north = extract_utm_from_filename(filepath)
    
    x_min = (east - 4000 ) * 10000
    y_min = (north - 50000 ) * 10000

    # scale the map to 0-10k
    x_scaled = x - x_min
    y_scaled = y - y_min
    
    down_index = np.random.choice(np.arange(x_scaled.size), int(x_scaled.shape[0]/downsize))
    x_sampled = x_scaled[down_index]
    y_sampled = y_scaled[down_index]

    east, north = extract_utm_from_filename(filepath)
    
    x_transformed = x_sampled + (east - min_east) /10 * max_size
    y_transformed = y_sampled + (north - min_north)/10 * max_size
    
    return np.vstack((x_transformed, y_transformed)).T
    

