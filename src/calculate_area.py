import sys
import geojson
from area import area

# Run with command line arguments:
# 1. A geojson file containing polygons without area
# 2. A geojson file to contain polygons with area
args = sys.argv
if len(args) != 3:
    sys.exit(1)
else:
    input_file = args[1]
    output_file = args[2]

with open(input_file, mode="r") as in_file:
    input_features = geojson.load(in_file)

output_features = []
for in_feature in input_features["features"]:
    # Calculate area
    polygon = in_feature["geometry"]
    area_in_square_m = round(area(polygon), 2)

    # Create output feature
    out_feature = in_feature
    out_feature["properties"]["area"] = area_in_square_m
    output_features.append(out_feature)

new_feature_collection = geojson.FeatureCollection(output_features)

with open(output_file, mode="w") as out_file:
    geojson.dump(new_feature_collection, out_file)