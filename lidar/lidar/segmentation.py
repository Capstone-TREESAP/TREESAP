import open3d as o3d
import numpy as np
from pclpy import pcl
import pclpy
from pyproj import Proj
import pickle
from PIL import Image
import math
import numpy as np
import plotly.graph_objects as go
import os
import laspy
from config import unlabelled_configure
from pre_processing import LiDARIndexType


class SegmentationProcessor:
    def __init__(self):
        self.uniform_down_k_point = unlabelled_configure.getint(
            "Parameters", "uniform_down_k_point")
        self.distance_threshold = unlabelled_configure.getfloat(
            "Parameters", "distance_threshold")
        self.ransac_n = unlabelled_configure.getint("Parameters", "ransac_n")
        self.num_iterations = unlabelled_configure.getint(
            "Parameters", "num_iterations")
        self.ground_threshold = unlabelled_configure.getfloat(
            "Parameters", "ground_threshold")
        self.eps = unlabelled_configure.getfloat("Parameters", "eps")
        self.min_points = unlabelled_configure.getint(
            "Parameters", "min_points")
        self.rgbvi_threshold = unlabelled_configure.getfloat(
            "Parameters", "rgbvi_threshold")

        self.high_vegetation = None
        self.labels = None

    def pre_process_pc(self):
        # read a las file
        point_cloud = pclpy.read(
            unlabelled_configure.get("Test", "las_file_path"), "PointXYZ")
        output = unlabelled_configure.get("Test", "pcd_output_path")
        writer = pcl.io.PCDWriter()
        writer.writeBinary(output, point_cloud)
        # pcd = o3d.io.read_point_cloud("../lidar/data/4810E_54560N.pcd")
        pcd = o3d.io.read_point_cloud(output)
        input_data = np.asarray(pcd.points)
        input_data[:, 0] = input_data[:, 0] - 481000
        input_data[:, 1] = input_data[:, 1] - 5456000
        pcd.points = o3d.utility.Vector3dVector(input_data)

        UTM_10_PROJ = Proj(
            "+proj=utm +zone=10N, +north +ellps=WGS84 +datum=WGS84 +units=m +no_defs")
        filename = unlabelled_configure.get("Test", "dem_path")
        xyz = open(filename, "r")
        count = 0
        for line in xyz:
            count += 1
        xyz.close()
        xyz = open(filename, "r")
        dem_points = np.ndarray((count, 3))
        count = 0
        for line in xyz:
            x, y, z = line.split()
        #     lat, lon = UTM_10_PROJ(x, y, inverse=True)
            dem_points[count, :] = np.array([x, y, z])
            count += 1
        xyz.close()
        dem_points[:, 0] = dem_points[:, 0] - 481000
        dem_points[:, 1] = dem_points[:, 1] - 5456000
        dem_pcd = o3d.geometry.PointCloud()
        dem_pcd.points = o3d.utility.Vector3dVector(dem_points)

        downpcd = pcd.uniform_down_sample(
            every_k_points=self.uniform_down_k_point)

        dists = downpcd.compute_point_cloud_distance(dem_pcd)
        dists = np.asarray(dists)
        downpcd_points = np.asarray(downpcd.points)
        downpcd_points[:, 2] = dists
        downpcd.points = o3d.utility.Vector3dVector(downpcd_points)

        plane_model, inliers = downpcd.segment_plane(distance_threshold=self.distance_threshold,
                                                     ransac_n=self.ransac_n,
                                                     num_iterations=self.num_iterations)
        inlier_cloud = downpcd.select_by_index(inliers)
        ground_diff = downpcd.compute_point_cloud_distance(inlier_cloud)
        ground_diff = np.asarray(ground_diff)
        ind = np.where(ground_diff > self.ground_threshold)[0]
        pcd_without_ground = downpcd.select_by_index(ind)

        with open(unlabelled_configure.get("Constants", "pkl_file_path"), "wb") as f:
            pickle.dump(np.asarray(pcd_without_ground.points), f)
        print(np.asarray(pcd_without_ground.points).shape)

    def process_pc(self):
        test = None
        with open(unlabelled_configure.get("Constants", "pkl_file_path"), "rb") as f:
            test = pickle.load(f)
        pkl_downpcd = o3d.geometry.PointCloud()
        pkl_downpcd.points = o3d.utility.Vector3dVector(test)

        with o3d.utility.VerbosityContextManager(
                o3d.utility.VerbosityLevel.Debug) as cm:
            labels = np.array(
                pkl_downpcd.cluster_dbscan(eps=self.eps, min_points=self.min_points, print_progress=True))

        small_img = Image.open(
            unlabelled_configure.get("Test", "rgb_img_path"))

        data = np.asarray(pkl_downpcd.points)
        img = np.array(small_img)

        high_vegetation = None

        for i in np.arange(labels.max()):
            x_cluster = data[:, 0][np.where(labels == i)]
            y_cluster = data[:, 1][np.where(labels == i)]
            z_cluster = data[:, 2][np.where(labels == i)]
            rgbvi_sum = 0
            for j in np.arange(x_cluster.shape[0]):
                rgb = img[math.floor(999 - y_cluster[j]),
                          math.ceil(x_cluster[j]) - 1, :]
                # the default type is uint
                rgb = rgb.astype('float64')
                base = (rgb[1] * rgb[1] + rgb[0]*rgb[2])

                # color can be 0, which leads to divide by zero.
                if np.isclose(base, 0):
                    continue
                rgbvi_sum += (rgb[1] * rgb[1] - rgb[0]*rgb[2]) / base

            rgbvi_avg = rgbvi_sum / x_cluster.shape[0]
            # filter
            if rgbvi_avg > self.rgbvi_threshold:
                if high_vegetation is None:
                    high_vegetation = np.vstack(
                        (x_cluster, y_cluster, z_cluster)).T
                else:
                    high_vegetation = np.vstack(
                        (high_vegetation, np.vstack((x_cluster, y_cluster, z_cluster)).T))
            else:
                labels[i] = -1

        self.high_vegetation = high_vegetation
        self.labels = labels[labels != -1]

    def export_to_las_file(self):

        header = laspy.header.Header()
        outFile1 = laspy.file.File(unlabelled_configure.get(
            "Test", "las_file_output_path"), mode="w", header=header)
        outFile1.X = self.high_vegetation[:, 0] + (4810 - 4000) * 10000
        outFile1.Y = self.high_vegetation[:, 1] + (54560 - 50000) * 10000
        outFile1.Z = self.high_vegetation[:, 2] * 100
        outFile1.Classification = np.ones(self.high_vegetation.shape[0]).astype(
            np.uint8) * LiDARIndexType.HIGH_VEGETATION

        outFile1.close()
