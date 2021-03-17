import pickle
import open3d as o3d
import numpy as np
test = None
with open("./no_ground_all.pkl", "rb") as f:
    test = pickle.load(f)
pkl_downpcd = o3d.geometry.PointCloud()
pkl_downpcd.points = o3d.utility.Vector3dVector(test)

print(test.shape)
eps= 3.0
min_points = 3
print(eps, min_points)

with o3d.utility.VerbosityContextManager(
        o3d.utility.VerbosityLevel.Debug) as cm:
    labels = np.array(
        pkl_downpcd.cluster_dbscan(eps=eps, min_points=min_points, print_progress=True))

max_label = labels.max()

from PIL import Image
small_img = Image.open("../../lidar/data/481E_5456N_tiny.png")
    
def display_labelled_data_2d(data, labels):
    import plotly.graph_objects as go

    size = 1000
    fig = go.Figure()
    for i in np.arange(labels.max()):
        x_cluster = data[:, 0][np.where(labels == i)]
        y_cluster = data[:, 1][np.where(labels == i)]
        fig.add_trace(go.Scattergl(x=x_cluster, y=y_cluster,
                                    mode='markers',
                                    marker=dict(
                                        size=3,
                                        color=i,                # set color to an array/list of desired values
                                        colorscale='Viridis',   # choose a colorscale
                                        opacity=0.8
    )))
    
    offset = 1000
    fig.add_layout_image(
            dict(
                source=small_img,
                xref="x",
                yref="y",
                x=0,
                y=offset,
                sizex=size,
                sizey=size,
                sizing="stretch",
                opacity=0.8,
                layer="below")
    )

    # Set templates
    fig.update_layout(template="plotly_white")
    fig.update_yaxes(
        scaleanchor = "x",
        scaleratio = 1,
      )
    fig.show()
display_labelled_data_2d(np.asarray(pkl_downpcd.points), labels)

img = np.array(small_img)
print(small_img.mode)