from sklearn.cluster import DBSCAN
import numpy as np
import time
import geojson
from alpha_shapes.alpha_shapes import Alpha_Shaper
import alphashape
import utm
from progress.bar import Bar
from config import CONSTANT
from pre_processing import PreProcessor
import pandas as pd
import os
import argparse

class ProcessingPipeline(CONSTANT):
    """ The main LiDAR processing pipeline that contains the preprocessing and processing stages. 

    Args:
        CONSTANT (class): Global constant class
    """
    def __init__(self, notebook=False):
        self.processing_time = 0
        self.pre_processor = None
        self.whole_campus_polygon_features = []
        self.reload = True
        if not notebook:
            parser = argparse.ArgumentParser(
                prog="CEDAR labelled LiDAR processing pipeline",
                description='Process indexed UBC LiDAR data')
            parser.add_argument('--load',help="Load points from .pkl file instead of from raw .las file. By default we will not load from .pkl file.", action="store_true")
            args = parser.parse_args()
            parser.print_help()
            self.reload = not args.load
        
    def pre_process_las_files(self, data_dir):
        """ preprocess the las file by extracting all the points, and save them into LasFile objects. 

        Args:
            data_dir (str): the source directory path
        """
        self.pre_processor = PreProcessor(data_dir)
        # check if we don't need to reload and pkl file already exist
        if not self.reload:
            return
        for las_file in self.pre_processor.lasfile_list:
            try: 
                las_file.point_x, las_file.point_y =  self.pre_processor.extract_relative_las_data(las_file)
                las_file.valid = True
            except LookupError:
                if self.DEBUG:
                    print("No trees are classified on the tile")
                las_file.valid = False

    def processing_by_map(self, output_file):
        """ process the whole map at once

        Args:
            output_file (str): the path to output file to save to.
        """
        all_point_x = np.array([])
        all_point_y = np.array([])

        if not self.reload and os.path.exists(self.PKL_FILE_PATH):
            points = self.load_points_from_pkl()
            all_point_x = points[:, 0].T 
            all_point_y = points[:, 1].T
        else:
            for las_file in self.pre_processor.lasfile_list:
                if las_file.valid:
                    all_point_x = np.append(all_point_x, las_file.point_x)
                    all_point_y = np.append(all_point_y, las_file.point_y)
            self.save_points_as_pkl(np.vstack((all_point_x, all_point_y)).T)
        
        print(all_point_x.shape)
        self.whole_campus_polygon_features = self.extract_polygon_features(all_point_x, all_point_y)
        self.__export_polygon_features_to_file(output_file, self.whole_campus_polygon_features)
    
    def select_optimal_eps():
        pass
    def extract_polygon_features(self, point_x, point_y):
        """Extract polygons from given p oints

        Args:
            point_x (np.array): points in relative x frame
            point_y (np.array): points in relative y frame

        Returns:
            polygons (list): list of geojson polygon features
        """
        points = np.vstack((point_x, point_y)).T
        
        # Cluster the points based on paramters
        clustering = DBSCAN(eps=self.EPS, min_samples=self.MIN_SAMPLE, n_jobs=12).fit(points)

        if self.DEBUG:
            print(" found %d clusters" % np.amax(clustering.labels_))
        
        start_time = time.perf_counter()
        
        polygons = []
        
        # set up a progress bar
        bar = Bar('Loading', fill='@', suffix='%(percent)d%% time: %(elapsed)ds', max=np.amax(clustering.labels_))
        
        for i in np.arange(np.amax(clustering.labels_)):
            bar.next()
            x_cluster = points[:, 0][np.where(clustering.labels_ == i)]
            y_cluster = points[:, 1][np.where(clustering.labels_ == i)]
            sample = np.vstack((x_cluster, y_cluster)).T

            if np.unique(sample, axis=0).shape[0] <= self.MIN_SIZE:
                continue
            
            alpha_opt = self.DEFAULT_ALPHA_SHAPE
            alpha_shape = alphashape.alphashape(sample, alpha_opt)

            if alpha_shape.area > self.MIN_POLYGON_AREA:
                sample_size = sample.shape[0]
                """
                if polygon's area is bigger than an single estimated tree area, that means there are more than one tree in the cluster 
                In this case, we want to use optimized alpha, and downscale the points to speed up the process
                """
                if sample_size > 1000:
                    reduce_to_1000 = lambda x : int(x) if x <= 1000 else reduce_to_1000(x/10)
                    desired_size = reduce_to_1000(sample_size)
                    down_sample_index = np.random.choice(np.arange(sample_size), desired_size)
                    # use optimized alpha shape value
                    alpha_shape = alphashape.alphashape(sample[down_sample_index])

            if alpha_shape.geom_type == self.ALPHA_SHAPE_MULTIPOLYGON_TYPE:
                # sometimes there will be more than one polygons from alpha shape. 
                for each_polyon in alpha_shape:
                    polygons.append(self.__get_polygon_from_feature(each_polyon))
            elif alpha_shape.geom_type == self.ALPHA_SHAPE_POLYGON_TYPE:
                polygons.append(self.__get_polygon_from_feature(alpha_shape))
                
            
        bar.finish()
        end_time = time.perf_counter()
        self.processing_time += end_time - start_time
        
        return polygons
    
    def update_parameters(self, down_size=CONSTANT.DOWN_SIZE, eps=CONSTANT.EPS, min_sample=CONSTANT.MIN_SAMPLE, min_size = CONSTANT.MIN_SIZE):
        self.pre_processor.DOWN_SIZE = down_size
        self.EPS = eps
        self.MIN_SAMPLE = min_sample 
        self.MIN_SIZE = min_size 
    
    def save_points_as_pkl(self, points):
        data = pd.DataFrame(data=points)
        data.to_pickle(self.PKL_FILE_PATH, compression='zip')

    def load_points_from_pkl(self):
        return pd.read_pickle(self.PKL_FILE_PATH, compression='zip').to_numpy()

    def __export_polygon_features_to_file(self, output_file, polygon_features):
        """ Save list of geojson features into a file

        Args:
            output_file (str): path to output file
            polygon_features (list): list of geojson features
        """
        with open(output_file, mode="w") as out_file:
            geojson.dump(geojson.FeatureCollection(polygon_features), out_file)
        
    def __get_polygon_from_feature(self, raw_polygon):
        """translate the shapely polygon format to geojson, and also from utm coordinate to Geographic coordinate

        Args:
            raw_polygon (shapely.polygon): polygons in shapely format

        Returns:
            geojson.Feature: geojson format polygon
        """
        raw_contour = np.array(list(raw_polygon.exterior.coords))
        
        # add utm coordinate to the data. Don't ask me how I translated it. 
        raw_contour[:, 0] /= 100.0
        raw_contour[:, 0] += self.pre_processor.min_east * 100
        raw_contour[:, 1] /= 100.0
        raw_contour[:, 1] += self.pre_processor.min_north * 100
        
        # translate utm to geographic
        raw_geo = utm.to_latlon(raw_contour[:, 0], raw_contour[:, 1], 10, 'U')
        geo_points = np.vstack((raw_geo[1], raw_geo[0])).T
        polygon = geojson.Polygon([geo_points.tolist()])
        
        return geojson.Feature(geometry=polygon)