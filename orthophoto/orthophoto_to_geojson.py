from shapely import geometry
from area import area
import os, cv2, geojson, uuid, sys, time
import numpy as np
import scipy.ndimage as ndimage
import matplotlib.pyplot as plt
from datetime import datetime
from matplotlib import cm, colors
from pyproj import Proj
UTM_10_PROJ = Proj("+proj=utm +zone=10N, +north +ellps=WGS84 +datum=WGS84 +units=m +no_defs")

# Whether to include the outline of the bounding polygon
#INCLUDE_BOUNDING_POLYGON = True
# Include debug print messages
DEBUG = False

'''
Finds all intersecting polygons and outputs them to geojson file with the given id prefix

all_polygons_file: geojson file containing all the polygons
bounding_polygon: The bounding polygon (geometry.shape)
output_file: geojson file containing all the polygons or parts of the polygons that are within the bounding polygon
id_prefix: all output polygons will have an id prefixed by this
'''
def find_intersecting_polygons(all_polygons_file, bounding_polygon, output_file, id_prefix):
    # Load all polygons into a feature set
    with open(all_polygons_file, mode="r") as in_file:
        all_polygons = geojson.load(in_file)

    total_area = 0
    num_polys = 0
    intersecting_polygons = []

    # Find the intersecting polygons
    for feature in all_polygons["features"]:
        polygon = geometry.shape(feature["geometry"])

        if not polygon.is_valid:
            if DEBUG:
                print("Attempting to fix invalid polygon")
            polygon = polygon.buffer(0)

            # If it's still not valid, just skip it
            if not polygon.is_valid:
                if DEBUG:
                    print("Fix was unsuccessful. Skipping polygon")
                continue

        intersection = bounding_polygon.intersection(polygon)

        # If polygon overlaps with bounds, we want to include it
        if intersection.area > 0:
            num_polys += 1

            # Construct new geojson polygon for intersection area
            if intersection.geom_type == 'MultiPolygon':
                new_polygon = geojson.MultiPolygon(geometry.mapping(intersection)["coordinates"])
            else:
                new_polygon = geojson.Polygon(geometry.mapping(intersection)["coordinates"])

            #Create feature and add to list
            new_feature = geojson.Feature(geometry=new_polygon)

            new_feature["properties"]["id"] = id_prefix + str(uuid.uuid4())

            # Add to list of features to return
            intersecting_polygons.append(new_feature)

    # Add all features to a feature set
    new_feature_collection = geojson.FeatureCollection(intersecting_polygons)

    # Output to a file
    with open(output_file, mode="w") as out_file:
        geojson.dump(new_feature_collection, out_file, indent=4)

'''
Calculates the standard devation in the specified window and returns if it's over the threshold

x: the minimum x value of the window
y: the minimum y value of the window
window_size: the width and height of the window
im: the image
'''
def stddev_above_threshold(x,y,window_size, threshold,im):
    r = im[x*window_size:(x+1)*window_size, y*window_size:(y+1)*window_size, 0:2]
    return r.std() > threshold

'''
Calculates the mean value in the specified window and returns if it's over 128 (50%)
Note: This was designed with a binary (255 or 0) mask in mind

x: the minimum x value of the window
y: the minimum y value of the window
window_size: the width and height of the window
green_mask: the mask
'''
def compressed_green(x,y,window_size,green_mask):
    r = green_mask[x*window_size:(x+1)*window_size, y*window_size:(y+1)*window_size]
    return r.mean() > 128

'''
Converts the given polygon to longitude and latitude with correct scaling

polygon_raw: the raw polygon
x_res: the resolution of x values
y_res: the resolution of y values
utm_10_top_left_coord: the utm10 coordinates of the top left corner of the image

returns the projected polygon
'''
def convert_to_lon_lat(polygon_raw, x_res, y_res, utm_10_top_left_coord):
    polygon_processed = [[x[0][0]*x_res+utm_10_top_left_coord[0],x[0][1]*y_res+utm_10_top_left_coord[1]] for x in polygon_raw]
    projected = [UTM_10_PROJ(x[0], x[1], inverse=True) for x in polygon_processed]
    head = projected[0]
    projected.append(head)
    return projected

'''
Extract tree cover from the tif and tfw files of the same name

filename: the name of the tif and tfw files
image_size: the width and height of the image
g: the granularity of the processing
stddev_threshold: standard deviation threshold
min_colour_threshold: the minimum colour that's considered green
max_colour_threshold: the maximum colour that's considered green
'''
def extract_tree_cover_from_tif_tfw(filename, image_size, g, stddev_threshold, min_colour_threshold, max_colour_threshold):
    # number of subimages
    n = int(image_size / g)
    print("Analysing "+ filename + ".tif...")
    x_res = 0.0
    y_res = 0.0
    x_coord = 0.0
    y_coord = 0.0

    with open(filename+".tfw", mode = "r") as tfw_file:
        x_res = float(tfw_file.readline())
        tfw_file.readline()
        tfw_file.readline()
        y_res = float(tfw_file.readline())
        x_coord = float(tfw_file.readline())
        y_coord = float(tfw_file.readline())

    image = cv2.imread(filename+'.tif')

    kernel = np.ones((g,g),np.float32)/(g*g)
    blurred_image = cv2.filter2D(image,-1,kernel)
    hsv_blurred_image = cv2.cvtColor(blurred_image, cv2.COLOR_RGB2HSV)
    mask = cv2.inRange(hsv_blurred_image, min_colour_threshold, max_colour_threshold)
    blurred_image = ndimage.gaussian_filter(image, sigma=2)
    stddev_array = np.array([stddev_above_threshold(i//n,i%n,g,stddev_threshold,blurred_image) for i in range(0,n**2)]).reshape(n,n)

    compressed_green_array = np.array([compressed_green(i//n,i%n,g,mask) for i in range(0,n**2)]).reshape(n,n)

    green_stddev_array = np.array([compressed_green_array[i//n,i%n] and stddev_array[i//n,i%n] for i in range(0,n**2)]).reshape(n,n)
    close_img = ndimage.binary_closing(green_stddev_array)
    open_img = ndimage.binary_opening(close_img)
    thresh = np.array(open_img*255,dtype=np.uint8)

    contours, hierarchy = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
    print("Found "+str(len(contours))+" contours in " + filename + ".tif")

    feature_list = []
    for c in contours:
        lon_lat = convert_to_lon_lat(c*g,x_res,y_res,[x_coord,y_coord])
        feature_list.append(geojson.Feature(geometry=geojson.Polygon([lon_lat])))
    feature_collection = geojson.FeatureCollection(feature_list)

    with open(filename + ".geojson", mode = "w") as out_file:
        geojson.dump(feature_collection,out_file)

# Command line arguments should be:
# 1. The directory containing all the tif and tfw
# 2. The bounding polygon to check for intersections with
# 3. The file to output the intersecting polygons to
# 4. The ID prefix
# 5. The standard deviation threshold
# 6-11.  [optional] The hsv of the min and max segmentation colour
args = sys.argv
if len(args) != 6 and len(args) != 12:
    print(
    '''
    Invalid args!
    Command line arguments should be:
    1. The directory containing all the tif and tfw
    2. The bounding polygon to check for intersections with
    3. The file to output the intersecting polygons to
    4. The ID prefix
    5. The standard deviation threshold
    6-11.  [optional] The hsv of the min and max segmentation colour
    '''
    )
    sys.exit(1)

if len(args) >= 6:
    tif_tfw_directory = args[1]
    with open(args[2], mode="r") as bounding_in_file:
        bounding_polygon = geometry.shape(geojson.load(bounding_in_file)["features"][0]["geometry"])
    output_file = args[3]
    id_prefix = args[4]
    standard_deviation_threshold = int(args[5])

if len(args) == 12:
    h_min = float(args[6])
    s_min = float(args[7])
    v_min = float(args[8])
    h_max = float(args[9])
    s_max = float(args[10])
    v_max = float(args[11])
else:
    h_min = 35.0
    s_min = 30.0
    v_min = 0.0
    h_max = 270.0
    s_max = 255.0
    v_max = 150.0

# size of image
image_size = 10000
# granularity of subimages
g = 20
min_colour = (h_min/360*255,s_min, v_min)
max_colour = (h_max/360*255,s_max, v_max)

#Start extraction
os.chdir(tif_tfw_directory)
for file in os.listdir(tif_tfw_directory):
     if file.endswith(".tif"):
        extract_tree_cover_from_tif_tfw(file[:-4],image_size,g,standard_deviation_threshold,min_colour,max_colour)

feature_list = []

for file in os.listdir(tif_tfw_directory):
     if file.endswith(".geojson"):
        with open(file) as f:
            gj = geojson.load(f)
            feature_list += gj['features']
feature_collection = geojson.FeatureCollection(feature_list)

all_polygons_file = "full_map.geojson"

with open(all_polygons_file, mode = "w") as out_file:
    geojson.dump(feature_collection,out_file)

find_intersecting_polygons(all_polygons_file, bounding_polygon, output_file, id_prefix)

print("Done!")
