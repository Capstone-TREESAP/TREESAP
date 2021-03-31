import geojson
from shapely import geometry
from area import area
import uuid
import sys
import time

# The color an intersecting polygon should be in hex format
INTERSECTION_COLOR = '#CC2828'
# Whether to include the whole polygons associated with each intersecting polygon
INCLUDE_GREY_POLYGONS = False
# Whether to include the outline of the bounding polygon
#INCLUDE_BOUNDING_POLYGON = True
# Include debug print messages
DEBUG = False

def set_polygon_color(feature, color):
    feature["properties"]["fill"] = color
    feature["properties"]["stroke"] = color


def fix_invalid_polygon(polygon):
    fixed_polygon = polygon.buffer(0)
    return fixed_polygon


# Command line arguments should be:
# 1. The file containing all polygons (or all relevant polygons)
# 2. The bounding polygon to check for intersections with
# 3. The file to output the intersecting polygons to
# 4. The ID prefix
args = sys.argv
if len(args) != 5:
    print("Invalid args")
    sys.exit(1)
else:
    all_polygons_file = args[1]
    with open(args[2], mode="r") as bounding_in_file:
        bounding_polygon = geometry.shape(geojson.load(bounding_in_file)["features"][0]["geometry"])
    output_file = args[3]

start = time.time()

# Load all polygons into a feature set
with open(all_polygons_file, mode="r") as in_file:
    all_polygons = geojson.load(in_file)

total_area = 0
num_polys = 0
intersecting_polygons = []

# Find the intersecting polygons
for feature in all_polygons["features"]:
    polygon = geometry.shape(feature["geometry"])

    # Check whether the polygon is valid, and attempt to fix if not
    # TODO: there is no guarantee that this currently keeps polygons the correct (original) shape
    #  and it should be validated in the future
    if not polygon.is_valid:
        if DEBUG:
            print("Attempting to fix invalid polygon")
        polygon = fix_invalid_polygon(polygon)

        # If it's still not valid, just skip it
        if not polygon.is_valid:
            if DEBUG:
                print("Fix was unsuccessful. Skipping polygon")
            continue

    intersection = bounding_polygon.intersection(polygon)

    # If polygon overlaps with bounds, we want to include it
    if intersection.area > 0:
        num_polys += 1

        if INCLUDE_GREY_POLYGONS:
            #Add the entire polygon to the list, in grey, if it goes outside the bounds
            if not (polygon.area == intersection.area):
                if polygon.geom_type == 'MultiPolygon':
                    whole_polygon = geojson.MultiPolygon(geometry.mapping(polygon)["coordinates"])
                else:
                    whole_polygon = geojson.Polygon(geometry.mapping(polygon)["coordinates"])
                whole_feature = geojson.Feature(geometry=whole_polygon)
                intersecting_polygons.append(whole_feature)

        # Construct new geojson polygon for intersection area
        if intersection.geom_type == 'MultiPolygon':
            new_polygon = geojson.MultiPolygon(geometry.mapping(intersection)["coordinates"])
        else:
            new_polygon = geojson.Polygon(geometry.mapping(intersection)["coordinates"])

        # Calculate the area
        #area_in_square_m = round(area(new_polygon), 2)
        #total_area += area_in_square_m

        #Create feature and add to list
        new_feature = geojson.Feature(geometry=new_polygon)
        #new_feature["properties"]["area"] = area_in_square_m

        new_feature["properties"]["id"] = args[4] + str(uuid.uuid4())

        #Set color
        #set_polygon_color(new_feature, INTERSECTION_COLOR)

        # Add to list of features to return
        intersecting_polygons.append(new_feature)


#if INCLUDE_BOUNDING_POLYGON:
#    # Add an outline of the bounding polygon
#    bounding_lines = geojson.LineString(list(bounding_polygon.exterior.coords))
#    bounding_feature = geojson.Feature(geometry=bounding_lines)
#else:
#    #Otherwise, just use an empty polygon to store the entire area
#    bounding_feature = geojson.Feature(geometry=None)
#
#bounding_feature["properties"]["area"] = round(total_area, 2)
#intersecting_polygons.append(bounding_feature)

# Add all features to a feature set
new_feature_collection = geojson.FeatureCollection(intersecting_polygons)

# Output to a file
with open(output_file, mode="w") as out_file:
    geojson.dump(new_feature_collection, out_file, indent=4)

end = time.time()
if DEBUG:
    print("Internal script computation time:", end - start, "seconds")
