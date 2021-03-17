import pickle
import open3d as o3d
test = None
with open("./no_ground_all.pkl", "rb") as f:
    test = pickle.load(f)
pkl_downpcd = o3d.geometry.PointCloud()
pkl_downpcd.points = o3d.utility.Vector3dVector(test)
