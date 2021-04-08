import open3d as o3d
import numpy as np
import pclpy
from pclpy import pcl
from pyproj import Proj
import pickle

# read a las file
point_cloud = pclpy.read(
    "../../lidar/data/2015/UBC_481_5456_UTM10_SP000-2595_v1.laz", "PointXYZ")
output = "../../lidar/data/UBC_481_5456_UTM10_SP000-2595_v1.pcd"
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
filename = '../../lidar/data/UBC_481_5456_UTM10_DEM_SP000-2595_v1.xyz'
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

downpcd = pcd.uniform_down_sample(every_k_points=20)

dists = downpcd.compute_point_cloud_distance(dem_pcd)
dists = np.asarray(dists)
downpcd_points = np.asarray(downpcd.points)
downpcd_points[:, 2] = dists
downpcd.points = o3d.utility.Vector3dVector(downpcd_points)

plane_model, inliers = downpcd.segment_plane(distance_threshold=1.0,
                                             ransac_n=3,
                                             num_iterations=1000)
inlier_cloud = downpcd.select_by_index(inliers)
ground_diff = downpcd.compute_point_cloud_distance(inlier_cloud)
ground_diff = np.asarray(ground_diff)
ind = np.where(ground_diff > 0.01)[0]
pcd_without_ground = downpcd.select_by_index(ind)

with open("no_ground_all.pkl", "wb") as f:
    pickle.dump(np.asarray(pcd_without_ground.points), f)
print(np.asarray(pcd_without_ground.points).shape)
