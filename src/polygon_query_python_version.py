import geojson
from shapely import geometry
from area import area
import sys

# File to import tree polygons from
ALL_POLYGONS_FILE = "../out/random_polygons.geojson"
OUTPUT_FILE = "../out/intersecting_polygons.geojson"
DEBUG = True

MIN_BOUND_X = -123.25
MAX_BOUND_X = -123.251
MIN_BOUND_Y = 49.26
MAX_BOUND_Y = 49.261
DEFAULT_BOUNDING_POLYGON = geometry.box(MIN_BOUND_X, MIN_BOUND_Y, MAX_BOUND_X, MAX_BOUND_Y)

'''
Gets the carbon sequestered annually by the treed area

treed_area: area that is treed in metres squared (m^2)

return: carbon sequestered in tonnes per year (t/yr)

Data obtained from https://canopy.itreetools.org/benefits, Urban Washington
Carbon Rate (t/ha/yr)	CO₂ Equiv. Rate (t/ha/yr)
30.600                  112.200
'''
def get_carbon_sequestered_annually(treed_area):
    return treed_area / 10000 * 30.600


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


def calculate_properties(polygon_area):
    carbon = get_carbon_sequestered_annually(polygon_area)
    runoff = get_avoided_runoff_annually(polygon_area)
    return carbon, runoff


# Load in the polygon to check for intersections with
args = sys.argv
if len(args) < 2:
    bounding_polygon = DEFAULT_BOUNDING_POLYGON
else:
    geojson_polygon = args[1]
    bounding_polygon = geojson.loads(geojson_polygon)

# Load all polygons into a feature set
with open(ALL_POLYGONS_FILE, mode="r") as in_file:
    all_polygons = geojson.load(in_file)

total_area = 0
num_polys = 0
intersecting_polygons = []

# Find the intersecting polygons
for feature in all_polygons["features"]:
    polygon = geometry.shape(feature["geometry"])
    intersection = bounding_polygon.intersection(polygon)

    if intersection.area > 0:
        num_polys += 1

        # Construct new geojson polygon for intersection area
        new_polygon = geojson.Polygon([list(intersection.exterior.coords)])

        # Calculate the area and ecosystem services values
        area_in_square_m = area(new_polygon)
        total_area += area_in_square_m
        sequestered_carbon, avoided_runoff = calculate_properties(area_in_square_m)

        # Create a new geojson feature
        new_feature = geojson.Feature(geometry=new_polygon)
        new_feature["properties"]["area"] = area_in_square_m
        new_feature["properties"]["sequestered_carbon"] = sequestered_carbon
        new_feature["properties"]["avoided_runoff"] = avoided_runoff

        # Add to list of features to return
        intersecting_polygons.append(new_feature)

# Calculate stats for total set
total_carbon, total_runoff = calculate_properties(total_area)
# This is hacky - a feature collection doesn't have properties, so add the aggregate data
# as a feature with no geometry
properties_feature = geojson.Feature(geometry=None)
properties_feature["properties"]["total_area"] = total_area
properties_feature["properties"]["total_sequestered_carbon"] = total_carbon
properties_feature["properties"]["total_avoided_runoff"] = total_runoff
intersecting_polygons.append(properties_feature)

# Add all features to a feature set
new_feature_collection = geojson.FeatureCollection(intersecting_polygons)

# Dump all features to a file
with open(OUTPUT_FILE, mode="w") as out_file:
    geojson.dump(new_feature_collection, out_file)

if DEBUG:
    print(geojson.dumps(new_feature_collection, indent=4))
