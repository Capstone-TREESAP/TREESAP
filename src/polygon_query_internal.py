import geojson
from shapely import geometry
from area import area
import sys

INTERSECTION_COLOR = '#CC2828'
DEBUG = True

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


def set_polygon_color(feature, color):
    feature["properties"]["fill"] = color
    feature["properties"]["stroke"] = color


# Command line arguments should be:
# 1. The file containing all polygons (or all relevant polygons)
# 2. The bounding polygon to check for intersections with
# 3. The file to output the intersecting polygons to
args = sys.argv
if len(args) != 4:
    sys.exit(1)
else:
    all_polygons_file = args[1]
    bounding_polygon = geometry.shape(geojson.loads(args[2]))
    output_file = args[3]

# Load all polygons into a feature set
with open(all_polygons_file, mode="r") as in_file:
    all_polygons = geojson.load(in_file)

total_area = 0
num_polys = 0
intersecting_polygons = []

# Find the intersecting polygons
for feature in all_polygons["features"]:
    polygon = geometry.shape(feature["geometry"])
    # TODO should we try to fix invalid polygons? Or require that all polygons are valid?
    if not polygon.is_valid:
        continue

    intersection = bounding_polygon.intersection(polygon)

    # If polygon overlaps with bounds, we want to include it
    if intersection.area > 0:
        num_polys += 1

        if DEBUG:
            #Add the entire polygon to the list, in grey
            whole_polygon = geojson.Polygon([list(polygon.exterior.coords)])
            whole_feature = geojson.Feature(geometry=whole_polygon)
            intersecting_polygons.append(whole_feature)

        # Construct new geojson polygon for intersection area
        new_polygon = geojson.Polygon([list(intersection.exterior.coords)])

        # Calculate the area
        area_in_square_m = round(area(new_polygon), 2)
        total_area += area_in_square_m
        
        #Create feature and add to list
        new_feature = geojson.Feature(geometry=new_polygon)

        # Add ecosystem services values
        sequestered_carbon, avoided_runoff = calculate_properties(area_in_square_m)
        new_feature["properties"]["area"] = area_in_square_m
        new_feature["properties"]["sequestered_carbon"] = sequestered_carbon
        new_feature["properties"]["avoided_runoff"] = avoided_runoff

        #Set color
        set_polygon_color(new_feature, INTERSECTION_COLOR)

        # Add to list of features to return
        intersecting_polygons.append(new_feature)


# Calculate stats for total set
total_carbon, total_runoff = calculate_properties(total_area)
bounding_lines = geojson.LineString(list(bounding_polygon.exterior.coords))
bounding_feature = geojson.Feature(geometry=bounding_lines)
bounding_feature["properties"]["area"] = total_area
bounding_feature["properties"]["sequestered_carbon"] = total_carbon
bounding_feature["properties"]["avoided_runoff"] = total_runoff
intersecting_polygons.append(bounding_feature)

# Add all features to a feature set
new_feature_collection = geojson.FeatureCollection(intersecting_polygons)

# Output to a file
with open(output_file, mode="w") as out_file:
    geojson.dump(new_feature_collection, out_file)
