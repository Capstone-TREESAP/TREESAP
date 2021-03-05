from pre_processing import *
from processing import *
import numpy as np
import time
import geojson

las_files = collect_las_file("../data/2018/")

min_east, min_north = np.inf, np.inf
min_filepath = ""
for file, coord in las_files.items():
    if (coord[0] <= min_east and coord[1] <= min_north):
        min_filepath = file
        min_east = coord[0]
        min_north = coord[1]
print(min_filepath)

def process_by_tile():
    """
    Total took 164.910562
    """
    whole_campus_polygons = []
    count = 0
    max = 2
    start_time = time.perf_counter()
    for file, coord in las_files.items():
        print("processing %d %d from %s" % (coord[0], coord[1], file))
        points = extract_relative_las_data(file, 10, min_east, min_north)
        if points is None:
            print("No tree found")
            continue
        polygons = lidar_pipeline(points, file, min_east, min_north, eps=800)
        if polygons is None:
            print("No cluster found")
            continue
        whole_campus_polygons.extend(polygons)
        count += 1
        if count > max:
            # break
            pass

    end_time = time.perf_counter()
    print("Total took %f" % (end_time - start_time))

        
    with open('test.geojson', mode="w") as out_file:
        geojson.dump(geojson.FeatureCollection(whole_campus_polygons), out_file)

def process_by_map():
    """ process the whole map at once
    reference processing time: 
        found 2647 clusters
        took 131.906588
        Total took 157.020290
    """
    whole_campus_polygons = []
    count = 0
    max = 2
    start_time = time.perf_counter()
    all_points = None
    for file, coord in las_files.items():
        print("processing %d %d from %s" % (coord[0], coord[1], file))
        points = extract_relative_las_data(file, 10, min_east, min_north)
        if points is None:
            print("No tree found")
            continue
    
        if all_points is None:
            all_points = points
        else:
            all_points = np.append(all_points, points, axis=0)
        count += 1
        if count > max:
            # break
            pass

    print(all_points.shape)
    polygons = lidar_pipeline(all_points, file, min_east, min_north, eps=800)
    whole_campus_polygons.extend(polygons)


    end_time = time.perf_counter()
    print("Total took %f" % (end_time - start_time))

        
    with open('test.geojson', mode="w") as out_file:
        geojson.dump(geojson.FeatureCollection(whole_campus_polygons), out_file)
        
process_by_map()