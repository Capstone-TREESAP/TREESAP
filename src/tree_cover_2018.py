import numpy as np
from laspy.file import File
import matplotlib.pyplot as plt
import os
from pyproj import Proj
import geojson

NEVER_CLASSIFIED = 0
UNCLASSIFIED = 1
GROUND = 2
LOW_VEGETATION = 3
MEDIUM_VEGETATION = 4
HIGH_VEGETATION = 5
BUILDING = 6
LOW_POINT = 7
MODEL_KEY_POINT = 8
WATER = 9

UTM_10_PROJ = Proj("+proj=utm +zone=10N, +north +ellps=WGS84 +datum=WGS84 +units=m +no_defs")
GRID_RESOLUTION = 100 # this is in metres
AREA_PER_GRID = GRID_RESOLUTION*GRID_RESOLUTION

'''
Gets the proportion of the points that have the given classification

classification_type: the classification to get proportion for
classification_data: the points to look for the given classification in

return: the proportion of points with that classification
'''
def get_classification_density(classification_type, classification_data):
    #print(in_file.raw_classification)
    #for i in range(0,10):
    #    print(i)
    #    print(np.where(i == in_file.raw_classification))
    data_len = len(classification_data)
    if data_len>0:
        return len(np.where(classification_type == classification_data)[0]) / len(classification_data)
    else:
        return 0.0

'''
Gets the the indices of the points, s.t. y∈[y-delta,y+delta] && y∈[y-delta,y+delta]

x: x value to get points around
y: y value to get points around
delta: the +- difference that is considered close
x_array: array of x values of points
y_array: array of y values of points

return: list of indices that are close to the x y value
'''
def get_indices_near_x_y_coord(x, y, delta, x_array, y_array):
    x_near = np.logical_and((x - delta < x_array),
                           (x + delta > x_array))
    y_near = np.logical_and((y - delta < y_array),
                           (y + delta > y_array))
    filtered_indices = np.where(np.logical_and(x_near, y_near))
    return filtered_indices[0]

'''
Plot classification histogram

classification_data: classification data to plot
'''
def plot_classification(classification_data):
    bins = range(0,10)
    plt.hist(classification_data, bins, histtype='bar')
    plt.title("Histogram of the Raw Classification Dimension")
    plt.show()

'''
Gets the carbon sequestered annually by the treed area

treed_area: area that is treed in metres squared (m^2)

return: carbon sequestered in tonnes per year (t/yr)

Data obtained from https://canopy.itreetools.org/benefits, Urban Washington
Carbon Rate (t/ha/yr)	CO₂ Equiv. Rate (t/ha/yr)
30.600                  112.200
'''
def get_carbon_sequestered_annually(treed_area):
    return treed_area/10000* 30.600*112.200

'''
Gets the avoided run off annually by the treed area

treed_area: area that is treed in m^2 (metres squared)

return: avoided run off in litres per year (L/yr)

Data obtained from https://canopy.itreetools.org/benefits, Urban Washington
Tree Effects (L/m²/yr)	Monetary Value (USD/m³/yr)
0.881                   $2.36
'''
def get_avoided_runoff_annually(treed_area):
    return treed_area * 0.881

'''
Processes .las file to return a list of geojson features that represent the las file

in_file: the las file

return: a list of geojson features
'''
def process_las_file(in_file):
    list_of_geojson_features = []
    for x in range(int(in_file.header.min[0]), int(in_file.header.max[0]) + 1, GRID_RESOLUTION):
        for y in range(int(in_file.header.min[1]), int(in_file.header.max[1]) + 1, GRID_RESOLUTION):
            nearby_indices = get_indices_near_x_y_coord(x, y, GRID_RESOLUTION, in_file.x, in_file.y)
            high_vegetation_density = get_classification_density(5,in_file.raw_classification[nearby_indices])
            treed_area = AREA_PER_GRID * high_vegetation_density
            lon,lat = UTM_10_PROJ(x,y,inverse=True)
            feature = geojson.Feature(geometry=geojson.Point((lon,lat)), properties={"high_vegetation_density": high_vegetation_density, "annual_avoided_runoff_l_per_yr": get_avoided_runoff_annually(treed_area), "annual_carbon_sequestration_t_per_yr": get_carbon_sequestered_annually(treed_area), "utm_10_x": x, "utm_10_y": y})
            list_of_geojson_features.append(feature)
    return list_of_geojson_features

########################################

directory = r'../cov_2018_data/'
all_geojson_features = []
for filename in os.listdir(directory):
    if filename.endswith(".las"):
        in_file = File(os.path.join(directory, filename), mode = "r")
        print("Processing " + os.path.join(directory, filename))
        for spec in in_file.point_format:
            print(spec.name)
        all_geojson_features = all_geojson_features + process_las_file(in_file)
feature_collection = geojson.FeatureCollection(all_geojson_features)
out_file = open("../out/all_data.geojson", mode = "w")
out_file.write(str(feature_collection))
