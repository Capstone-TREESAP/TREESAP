import geojson
import random
import math
from scipy import spatial
import numpy as np

# Approximate square bounds for the UBC campus
MIN_BOUND_X = 49.25
MAX_BOUND_X = 49.275
MIN_BOUND_Y = -123.23
MAX_BOUND_Y = -123.26
# The minimum area for a bounding box of a polygon
MIN_AREA = 0.0000005
# The probability that a bounding box will not contain a polygon
SKIP_PROB = 0.1
# Number of points in a polygon
MIN_POINTS = 3
MAX_POINTS = 15
# Path for file to write to
OUTPUT_FILE = "../out/random_polygons.geojson"
# Random seed for deterministic testing
SEED = 0


# Bounding box that a polygon must fit in
class BoundingBox:

    # Create a bounding box based on the provided coordinates
    def __init__(self, min_x, min_y, max_x, max_y):
        if min_x < max_x:
            self.min_x = min_x
            self.max_x = max_x
        else:
            self.min_x = max_x
            self.max_x = min_x

        if min_y < max_y:
            self.min_y = min_y
            self.max_y = max_y
        else:
            self.min_y = max_y
            self.max_y = min_y

    def x_length(self):
        return math.fabs(self.max_x - self.min_x)

    def y_length(self):
        return math.fabs(self.max_y - self.min_y)

    def area(self):
        return self.x_length() * self.y_length()

    # Recursively divide this large box into small boxes that have
    # an approximate area of min_area
    def smaller_boxes(self, min_area):
        if self.area() <= min_area:
            return [self]

        # divide in the direction with the largest length
        x_divide = (self.x_length() > self.y_length())

        if x_divide:
            divide_point = random.uniform(self.min_x, self.max_x)
            first_box = BoundingBox(self.min_x, self.min_y, divide_point, self.max_y)
            second_box = BoundingBox(divide_point, self.min_y, self.max_x, self.max_y)
        else:
            divide_point = random.uniform(self.min_y, self.max_y)
            first_box = BoundingBox(self.min_x, self.min_y, self.max_x, divide_point)
            second_box = BoundingBox(self.min_x, divide_point, self.max_x, self.max_y)

        return first_box.smaller_boxes(min_area) + second_box.smaller_boxes(min_area)


# Create a polygon that fits within the BoundingBox bounds.
# Created with num_points points within or on the edge of the
#  polygon, then turned into the convex hull of those points
def create_random_polygon(num_points, bounds):
    points = []
    for _ in range(num_points):
        point_x = random.uniform(bounds.min_x, bounds.max_x)
        point_y = random.uniform(bounds.min_y, bounds.max_y)
        point = [point_y, point_x]
        points.append(point)

    hull_points = np.array(points)
    hull = spatial.ConvexHull(hull_points)

    sorted_points = hull_points[hull.vertices].tolist()
    sorted_points.append(sorted_points[0])

    polygon = geojson.Polygon([sorted_points])
    return geojson.Feature(geometry=polygon)


random.seed(SEED)
# Create one polygon per small bounding box
all_geojson_features = []
all_bounds = BoundingBox(MIN_BOUND_X, MIN_BOUND_Y, MAX_BOUND_X, MAX_BOUND_Y).smaller_boxes(MIN_AREA)
for bound in all_bounds:
    # Skip some boxes to help spread out polygons
    if random.uniform(0, 1) < SKIP_PROB:
        continue
    # Create the polygon and add it to the features
    new_polygon = create_random_polygon(int(random.uniform(MIN_POINTS, MAX_POINTS)), bound)
    all_geojson_features.append(new_polygon)

# Collect all the features and write to the output file
feature_collection = geojson.FeatureCollection(all_geojson_features)
with open(OUTPUT_FILE, mode="w") as out_file:
    geojson.dump(feature_collection, out_file)
