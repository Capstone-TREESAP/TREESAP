from sklearn.cluster import DBSCAN
import numpy as np
import time
import geojson
from alpha_shapes.alpha_shapes import Alpha_Shaper
import utm
from progress.bar import Bar
from config import CONSTANT
from pre_processing import PreProcessor


class ProcessingPipeline(CONSTANT):
    """ The main LiDAR processing pipeline that contains the preprocessing and processing stages. 

    Args:
        CONSTANT (class): Global constant class
    """
    def __init__(self):
        self.processing_time = 0
        self.pre_processor = None
        self.whole_campus_polygon_features = []
        
    def pre_process_las_files(self, data_dir):
        """ preprocess the las file by extracting all the points, and save them into LasFile objects. 

        Args:
            data_dir (str): the source directory path
        """
        self.pre_processor = PreProcessor(data_dir)
        for las_file in self.pre_processor.lasfile_list:
            try: 
                las_file.point_x, las_file.point_y =  self.pre_processor.extract_relative_las_data(las_file)
                las_file.valid = True
            except LookupError:
                if self.DEBUG:
                    print("No trees are classified on the tile")
                las_file.valid = False
                
    def processing_by_file(self, output_file):
        """ process polygons file by file

        Args:
            output_file (str): the path to output file to save to.
        """
        bar = Bar('Processing', max=len(self.pre_processor.lasfile_list),  suffix='%(index)d/%(max)dfiles')
        for las_file in self.pre_processor.lasfile_list:
            if las_file.valid:
                polygon_features = self.extract_polygon_features(las_file.point_x, las_file.point_y)
                self.whole_campus_polygon_features.extend(polygon_features)
            bar.next()
        bar.finish()
        self.__export_polygon_features_to_file(output_file, self.whole_campus_polygon_features)
        if self.DEBUG:
            print("Total processing time: %d" % self.processing_time)

    def processing_by_map(self, output_file):
        """ process the whole map at once

        Args:
            output_file (str): the path to output file to save to.
        """
        all_point_x = []
        all_point_y = []
        
        for las_file in self.pre_processor.lasfile_list:
            if las_file.valid:
                all_point_x.extend(las_file.point_x)
                all_point_y.extend(las_file.point_y)
                
        self.whole_campus_polygon_features = self.extract_polygon_features(all_point_x, all_point_y)
        self.__export_polygon_features_to_file(output_file, self.whole_campus_polygon_features)
        

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
        clustering = DBSCAN(eps=self.EPS, min_samples=self.MIN_SAMPLE).fit(points)

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
            shaper = Alpha_Shaper(sample)

            alpha_opt = 0.0
            
            try:
                alpha_opt, alpha_shape = shaper.optimize()
            except IndexError:
                continue
            except ValueError:
                continue

            alpha_shape = shaper.get_shape(alpha=alpha_opt)
            if alpha_shape.geom_type == 'MultiPolygon':
                # sometimes there will be more than one polygons from alpha shape. 
                for each_polyon in alpha_shape:
                    polygons.append(self.__get_polygon_from_feature(each_polyon))
            elif alpha_shape.geom_type == 'Polygon':
                polygons.append(self.__get_polygon_from_feature(alpha_shape))
                
            
        bar.finish()
        end_time = time.perf_counter()
        self.processing_time += end_time - start_time
        
        return polygons