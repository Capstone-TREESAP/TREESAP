from PIL import Image
import math
import numpy as np
import plotly.graph_objects as go
small_img = Image.open("../lidar/data/481E_5456N_tiny.png")

data = np.asarray(pkl_downpcd.points)
img = np.array(small_img)
print(small_img.mode)
size = 1000
fig = go.Figure()

high_vegetation = None

for i in np.arange(labels.max()):
#     i = labels.max() - i
    x_cluster = data[:, 0][np.where(labels == i)]
    y_cluster = data[:, 1][np.where(labels == i)]
    z_cluster = data[:, 2][np.where(labels == i)]
    rgbvi_sum = 0
    gli_sum = 0
    for i in np.arange(x_cluster.shape[0]):
        rgb = img[math.floor(999 - y_cluster[i]), math.ceil(x_cluster[i]) - 1,  :]
        # the default type is uint
        rgb = rgb.astype('float64') 
        gli_sum += (2 * rgb[1] - rgb[0] - rgb[2]) / (2 * rgb[1] + rgb[0] + rgb[2])
        rgbvi_sum +=((rgb[1] * rgb[1] - rgb[0]*rgb[2]) * 1.0) /(rgb[1] * rgb[1]  + rgb[0]*rgb[2]) 
    rgbvi_avg = rgbvi_sum /  x_cluster.shape[0]
    gli_avg = gli_sum /  x_cluster.shape[0]
    # filter
    if rgbvi_avg > 0.03:
#     fig.add_annotation(x=x_cluster[0], y=y_cluster[0],
#         text="rgbvi:%.3f" % rgbvi_avg,
#         showarrow=True,
#         arrowhead=1)
#     fig.add_annotation(x=x_cluster[-1], y=y_cluster[-1],
#         text="gli:%.3f" % gli_avg,
#         showarrow=True,
#         arrowhead=1)
        if high_vegetation is None:
            high_vegetation = np.vstack((x_cluster, y_cluster, z_cluster)).T
        else:
            high_vegetation = np.vstack((high_vegetation, np.vstack((x_cluster, y_cluster, z_cluster)).T))
        fig.add_trace(go.Scattergl(x=x_cluster, y=y_cluster, 
           mode = "markers",
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
            opacity=0.85,
            layer="below")
)

# Set templates
fig.update_layout(template="plotly_white")
fig.update_traces(textposition='top center')
fig.update_yaxes(
    scaleanchor = "x",
    scaleratio = 1,
  )
# pio.renderers.default = "jupyterlab"
fig.show()