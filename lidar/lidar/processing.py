from sklearn.cluster import DBSCAN
import numpy as np
import time
import geojson
import alphashape
import utm
from tqdm import tqdm
from config import configure
from pre_processing import PreProcessor
import pandas as pd
import os
import argparse


class ProcessingPipeline:
    """The main LiDAR processing pipeline that contains the preprocessing and processing stages.

    Args:
        CONSTANT (class): Global constant class
    """

    def __init__(self, notebook=False):
        self.processing_time = 0
        self.pre_processor = None
        self.whole_campus_polygon_features = []
        self.reload = True
        self.whole_campus_x = np.array([])
        self.whole_campus_y = np.array([])
        if not notebook:
            parser = argparse.ArgumentParser(
                prog="TREESAP labelled LiDAR processing pipeline",
                description="Process indexed UBC LiDAR data",
            )
            parser.add_argument(
                "--load",
                help="Load points from .pkl file instead of from raw .las file. By default we will not load from .pkl file.",
                action="store_true",
            )
            args = parser.parse_args()
            parser.print_help()
            self.reload = not args.load

    def pre_process_las_files(self, data_dir):
        """preprocess the las file by extracting all the points, and save them into LasFile objects.

        Args:
            data_dir (str): the source directory path
        """
        self.pre_processor = PreProcessor(data_dir)
        # check if we don't need to reload and pkl file already exist
        if not self.reload:
            return
        for las_file in self.pre_processor.lasfile_list:
            try:
                (
                    las_file.point_x,
                    las_file.point_y,
                ) = self.pre_processor.extract_relative_las_data(las_file)
                las_file.valid = True
            except LookupError:
                if configure.getboolean("Configure", "DEBUG"):
                    print("No trees are classified on the tile")
                las_file.valid = False
        if configure.getboolean("Configure", "debug"):
            print("Complete loading LAS files")

    def collect_points_from_map(self):
        """[summary]

        Returns:
            [type]: [description]
        """

        if not self.reload and os.path.exists(
            configure.get("Constants", "pkl_file_path")
        ):
            # load the data from pkl if we choose not to reload, and the data file exists
            points = self.load_points_from_pkl()
            self.whole_campus_x = points[:, 0].T
            self.whole_campus_y = points[:, 1].T
            if configure.getboolean("Configure", "debug"):
                print("Loaded points from data file")
        else:
            if configure.getboolean("Configure", "debug"):
                print("Reloading points from LAS files")
            all_point_x = np.array([])
            all_point_y = np.array([])

            # extract all the points from pre processed files
            for las_file in self.pre_processor.lasfile_list:
                if las_file.valid:
                    all_point_x = np.append(all_point_x, las_file.point_x)
                    all_point_y = np.append(all_point_y, las_file.point_y)

            # remove points that are out of boundary
            self.whole_campus_x, self.whole_campus_y = self.pre_processor.filter_out_of_campus_points(
                all_point_x, all_point_y)
            if configure.getboolean("Configure", "debug"):
                print("Saving points into data file")
            self.save_points_as_pkl(
                np.vstack((self.whole_campus_x, self.whole_campus_y)).T)

            if configure.getboolean("Configure", "debug"):
                print("Reloaded points from LAS file")
        return self.whole_campus_x, self.whole_campus_y

    def extract_polygon_features(self, point_x=None, point_y=None, callback=None):
        """Extract polygons from given p oints

        Args:
            point_x (np.array): points in relative x frame
            point_y (np.array): points in relative y frame

        Returns:
            polygons (list): list of geojson polygon features
        """
        points = None
        if point_x is not None and point_y is not None:
            points = np.vstack((point_x, point_y)).T
        else:
            points = np.vstack((self.whole_campus_x, self.whole_campus_y)).T

        start_time = time.perf_counter()

        # Cluster the points based on paramters
        clustering = DBSCAN(
            eps=configure.getfloat("Parameters", "eps"),
            min_samples=configure.getfloat("Parameters", "min_sample"),
            n_jobs=-1,
        ).fit(points)

        end_time = time.perf_counter()
        self.processing_time += end_time - start_time

        if configure.getboolean("Configure", "debug"):
            print(
                "Clustering took %f seconds, found %d clusters"
                % (self.processing_time, np.amax(clustering.labels_))
            )

        polygons = []

        # set up a progress bar
        for i in tqdm(np.arange(np.amax(clustering.labels_))):
            if callback is not None:
                callback(i, np.amax(clustering.labels_))
            x_cluster = points[:, 0][np.where(clustering.labels_ == i)]
            y_cluster = points[:, 1][np.where(clustering.labels_ == i)]
            sample = np.vstack((x_cluster, y_cluster)).T

            alpha_opt = configure.getfloat("Constants", "default_alpha_shape")
            alpha_shape = alphashape.alphashape(sample, alpha_opt)

            # # ignore the polygons that are too big
            if alpha_shape.area > configure.getint("Parameters", "max_polygon_area"):
                continue

            # optimize the alpha for polygons in fitting size
            if alpha_shape.area > configure.getint("Parameters", "min_polygon_area"):
                sample_size = sample.shape[0]
                """
                if polygon's area is bigger than an single estimated tree area, that means there are more than one tree in the cluster 
                In this case, we want to use optimized alpha, and downscale the points to speed up the process
                """
                if sample_size > configure.getint("Parameters", "alphashape_reduction"):
                    reduce_shape_size = (
                        lambda x: int(x) if x <= configure.getint(
                            "Parameters", "alphashape_reduction") else reduce_shape_size(x / 10)
                    )
                    desired_size = reduce_shape_size(sample_size)
                    down_sample_index = np.random.choice(
                        np.arange(sample_size), desired_size
                    )
                    # use optimized alpha shape value
                    alpha_shape = alphashape.alphashape(
                        sample[down_sample_index])

            if alpha_shape.geom_type == configure.get(
                "Constants", "alpha_shape_multipolygon_type"
            ):
                # sometimes there will be more than one polygons from alpha shape.
                for each_polyon in alpha_shape:
                    polygons.append(
                        self.__get_polygon_from_feature(each_polyon))
            elif alpha_shape.geom_type == configure.get(
                "Constants", "alpha_shape_polygon_type"
            ):
                polygons.append(self.__get_polygon_from_feature(alpha_shape))

        return polygons

    def extract_forest_polygons_features(self, point_x, point_y):
        """extract only the large forest from the whole map, use manually tuned parameters

        Args:
            point_x ([type]): [description]
            point_y ([type]): [description]

        Returns:
            [type]: [description]
        """
        points = np.vstack((point_x, point_y)).T

        start_time = time.perf_counter()

        # Cluster the points based on paramters
        clustering = DBSCAN(
            eps=configure.getfloat("Parameters", "eps"),
            min_samples=configure.getfloat("Parameters", "min_sample"),
            n_jobs=-1,
        ).fit(points)

        end_time = time.perf_counter()
        self.processing_time += end_time - start_time

        if configure.getboolean("Configure", "debug"):
            print(
                "Clustering took %f seconds, found %d clusters"
                % (self.processing_time, np.amax(clustering.labels_))
            )

        polygons = []

        shapely_polygons = []

        # set up a progress bar

        max = 0
        for i in tqdm(np.arange(np.amax(clustering.labels_))):
            x_cluster = points[:, 0][np.where(clustering.labels_ == i)]
            y_cluster = points[:, 1][np.where(clustering.labels_ == i)]
            sample = np.vstack((x_cluster, y_cluster)).T

            if np.unique(sample, axis=0).shape[0] <= configure.getint(
                "Parameters", "min_size"
            ):
                continue

            alpha_opt = configure.getfloat("Constants", "default_alpha_shape")
            alpha_shape = alphashape.alphashape(sample, alpha_opt)

            if alpha_shape.area > max:
                max = alpha_shape.area
            #                    104204026795
            if alpha_shape.area > 5000000000:
                sample_size = sample.shape[0]
                # 6000
                reduce_to_1000 = (
                    lambda x: int(x) if x <= 500 else reduce_to_1000(x / 10)
                )
                desired_size = reduce_to_1000(sample_size)
                down_sample_index = np.random.choice(
                    np.arange(sample_size), desired_size
                )
                # use optimized alpha shape value
                # TODO: don't use optimze, instead use pre-defined alpha
                alpha_shape = alphashape.alphashape(sample[down_sample_index])

                # save these polygons to a pkl file

                if alpha_shape.geom_type == configure.get(
                    "Constants", "alpha_shape_multipolygon_type"
                ):
                    # sometimes there will be more than one polygons from alpha shape.
                    for each_polyon in alpha_shape:
                        polygons.append(
                            self.__get_polygon_from_feature(each_polyon))
                        shapely_polygons.append(each_polyon)
                elif alpha_shape.geom_type == configure.get(
                    "Constants", "alpha_shape_polygon_type"
                ):
                    polygons.append(
                        self.__get_polygon_from_feature(alpha_shape))
                    shapely_polygons.append(alpha_shape)
        print("max is ", max)
        return polygons, shapely_polygons

    def save_points_as_pkl(self, points):
        data = pd.DataFrame(data=points)
        data.to_pickle(configure.get(
            "Constants", "pkl_file_path"), compression="zip")

    def load_points_from_pkl(self):
        return pd.read_pickle(
            configure.get("Constants", "pkl_file_path"), compression="zip"
        ).to_numpy()

    def export_polygon_features_to_file(self, output_file, polygon_features):
        """Save list of geojson features into a file

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
        raw_geo = utm.to_latlon(raw_contour[:, 0], raw_contour[:, 1], 10, "U")
        geo_points = np.vstack((raw_geo[1], raw_geo[0])).T
        polygon = geojson.Polygon([geo_points.tolist()])

        return geojson.Feature(geometry=polygon)
