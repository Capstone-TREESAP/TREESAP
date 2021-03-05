from sklearn.cluster import DBSCAN
import numpy as np
from laspy.file import File
import time
import geojson
import plotly.graph_objects as go
from PIL import Image
from alpha_shapes.alpha_shapes import Alpha_Shaper
import utm
import ntpath
import fnmatch, re

from pre_processing import *

# small_img = Image.open("../data/481E_5456N_tiny.png")

MIN_SIZE = 20

def get_polygon_from_feature(raw_polygon, min_east, min_north):
    """[summary]

    Args:
        raw_polygon ([type]): [description]
        east ([type]): [description]
        north ([type]): [description]
        min_east ([type]): [description]
        min_north ([type]): [description]

    Returns:
        [type]: [description]
    """
    raw_contour = np.array(list(raw_polygon.exterior.coords))
    
    # transform the points back to relative to it's global coordiante
    # raw_contour[:, 0] -= (east - min_east)/10 * 100000
    # raw_contour[:, 1] -= (north - min_north)/10 * 100000
    
    # add utm coordinate to the data
    raw_contour[:, 0] /= 100.0
    raw_contour[:, 0] += min_east * 100
    raw_contour[:, 1] /= 100.0
    raw_contour[:, 1] += min_north * 100
    raw_geo = utm.to_latlon(raw_contour[:, 0], raw_contour[:, 1], 10, 'U')
    geo_points = np.vstack((raw_geo[1], raw_geo[0])).T
    polygon = geojson.Polygon([geo_points.tolist()])
    return geojson.Feature(geometry=polygon)

# 0 - 100% of the map from top left corner
def lidar_pipeline(points, input_file, min_east, min_north, eps=1000):
#     ratio = 100
    # we are in cm unit
    # print(points.shape)
    
    clustering = DBSCAN(eps=eps, min_samples=2).fit(points)

    print("found %d clusters" % np.amax(clustering.labels_))
    
    start_time = time.perf_counter()
    
    polygons = []
    for i in np.arange(np.amax(clustering.labels_)):
        x_cluster = points[:, 0][np.where(clustering.labels_ == i)]
        y_cluster = points[:, 1][np.where(clustering.labels_ == i)]
        sample = np.vstack((x_cluster, y_cluster)).T
        # fig.add_trace(go.Scatter(x=x_cluster, y=y_cluster, mode='markers'))
        
        if np.unique(sample, axis=0).shape[0] <= MIN_SIZE:
            continue
        shaper = Alpha_Shaper(sample)

        alpha_opt = 0.0
        
        try:
            alpha_opt, alpha_shape = shaper.optimize()
        except IndexError:
            continue
        except ValueError:
            continue
        except:
            import sys
            print("Unexpected error:", sys.exc_info()[0])
            continue
        alpha_shape = shaper.get_shape(alpha=alpha_opt)
        if alpha_shape.geom_type == 'MultiPolygon':
            for poly in alpha_shape:
                polygons.append(get_polygon_from_feature(poly, min_east, min_north))
        elif alpha_shape.geom_type == 'Polygon':
            polygons.append(get_polygon_from_feature(alpha_shape, min_east, min_north))
    end_time = time.perf_counter()
    print("took %f" % (end_time - start_time))
    return polygons