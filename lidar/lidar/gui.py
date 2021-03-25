import plotly.graph_objects as go
from PIL import Image
import numpy as np
from sklearn.cluster import DBSCAN, OPTICS
from progress.bar import Bar
import plotly.io as pio
# too many points, cannot render embedded
# https://plotly.com/python/renderers/

class GraphGUI():
    def __init__(self):
        self._x = np.array([])
        self._y = np.array([])
        self._z = np.array([])
        self._label = np.array([])
        self.add_image = True
        self.small_img = Image.open("../data/481E_5456N_tiny.png")
    @property
    def x(self):
        return self._x
    @property
    def y(self):
        return self._y
    @property
    def z(self):
        return self._z
    @property
    def label(self):
        return self._label
    @x.setter
    def x(self, x):
        self._x = x
    @y.setter
    def y(self, y):
        self._y = y
    @z.setter
    def z(self, z):
        self._z = z
    @label.setter
    def label(self, label):
        self._label = label
        
    def display_2d_pcd(self, offset, render="browser"):
        """[summary]

        Args:
            offset ([type]): [description]
            render (str, optional): [description]. Defaults to "browser".
        """
        if not self.__data_checker(pcd_2d=True):
            return 
        pio.renderers.default = render
        fig = go.Figure(data=go.Scattergl(
        x = self._x,
        y = self._y,
        mode='markers',
        marker=dict(
            size=3,
            colorscale='Viridis',   # choose a colorscale
            opacity=0.8
        )))

        if self.add_image:
            # Add images
            fig.add_layout_image(
                    dict(
                        source=self.small_img,
                        xref="x",
                        yref="y",
                        x=0,
                        y=offset,
                        sizex=offset,
                        sizey=offset,
                        sizing="stretch",
                        opacity=0.8,
                        layer="below")
            )

        # Set templates
        fig.update_layout(template="plotly_white")

        fig.update_yaxes(
            scaleanchor = "x",
            scaleratio = 1
        )
        fig.show()
        
    def display_2d_labelled_pcd(self, offset, render="browser"):
        """[summary]

        Args:
            offset ([type]): [description]
            render (str, optional): [description]. Defaults to "browser".
        """
        if not self.__data_checker(pcd_2d=True, pcd_label=True):
            return 
        pio.renderers.default = render
        fig = go.Figure()
        for i in np.arange(np.amax(self._label)):
            x_cluster = self._x[np.where(self._label == i)]
            y_cluster = self._y[np.where(self._label == i)]
            fig.add_trace(go.Scattergl(x=x_cluster, y=y_cluster,
                mode='markers',
                marker=dict(
                    size=3,
                    colorscale='Viridis',   # choose a colorscale
                    opacity=0.8)
            ))

        if self.add_image:
            # Add images
            fig.add_layout_image(
                dict(
                    source=self.small_img,
                    xref="x",
                    yref="y",
                    x=0 ,
                    y=offset,
                    sizex=offset,
                    sizey=offset,
                    sizing="stretch",
                    opacity=0.5,
                    layer="below")
            )

        fig.update_yaxes(
            scaleanchor = "x",
            scaleratio = 1,
        )
        fig.show()
        
    def display_3d_pcd(self, render="browser"):
        """[summary]

        Args:
            render (str, optional): [description]. Defaults to "browser".
        """
        if not self.__data_checker(pcd_3d=True):
            return 
        pio.renderers.default = render
        fig = go.Figure(data=go.Scatter3d(
        x = self._x,
        y = self._y,
        z = self._z,
        mode='markers',
        marker=dict(
            size=3,
            color=self._z,
            colorscale='Viridis',   # choose a colorscale
            opacity=0.8
        )))

        fig.update_yaxes(
            scaleanchor = "x",
            scaleratio = 1
        )
        fig.show()
        
    def __data_checker(self, pcd_2d=False, pcd_3d=False, pcd_label=False):
        """[summary]

        Args:
            pcd_2d (bool, optional): [description]. Defaults to False.
            pcd_3d (bool, optional): [description]. Defaults to False.
            pcd_label (bool, optional): [description]. Defaults to False.

        Returns:
            [type]: [description]
        """
        validated = True
        if pcd_2d:
            if self.x.size == 0:
                print("No x axis data")
                validated = False
            if self.y.size == 0:
                print("No y axis data")
                validated = False
        
        if pcd_3d:
            if self.x.size == 0:
                print("No x axis data")
                validated = False
            if self.y.size == 0:
                print("No y axis data")
                validated = False
            if self.z.size == 0:
                print("No z axis data")
                validated = False
        if pcd_label:
            if self.label.size == 0:
                print("No label axis data")
                validated = False
        return validated
    
    def DBSCAN_2d_tuner(self, esp_range = [500, 1000], min_sample=20, render="browser"):
        if not self.__data_checker(pcd_2d=True):
            return 
        pio.renderers.default = render
        
        # Create figure
        fig = go.Figure()

        bar = Bar('Loading', fill='@', suffix='%(percent)d%% time: %(elapsed)ds', max=int((esp_range[1]-esp_range[0])/100))
        
        # Add traces, one for each slider step
        for esp_step in np.arange(esp_range[0], esp_range[1], 100):
            bar.next()
            points = np.vstack((self._x, self._y)).T
            clustering = OPTICS(max_eps=esp_step, min_samples=min_sample, n_jobs=-1).fit(points)
            for i in np.arange(np.amax(clustering.labels_)):
                x_cluster = self._x[np.where(self._label == i)]
                y_cluster = self._y[np.where(self._label == i)]
                fig.add_trace(go.Scattergl(x=x_cluster, y=y_cluster,
                    mode='markers',
                    marker=dict(
                        size=3,
                        colorscale='Viridis',   # choose a colorscale
                        opacity=0.8)
                ))
            
        bar.finish()
        
        # Make 10th trace visible
        fig.data[0].visible = True

        # Create and add slider
        steps = []
        for i in range(len(fig.data)):
            step = dict(
                method="update",
                args=[{"visible": [False] * len(fig.data)},
                    {"title": "Slider switched to step: " + str(i)}],  # layout attribute
            )
            step["args"][0]["visible"][i] = True  # Toggle i'th trace to "visible"
            steps.append(step)

        sliders = [dict(
            active=0,
            currentvalue={"prefix": "Frequency: "},
            pad={"t": 50},
            steps=steps
        )]

        fig.update_layout(
            sliders=sliders
        )

        fig.show()
        
# from processing import ProcessingPipeline
# pipeline = ProcessingPipeline()
# points = pipeline.load_points_from_pkl()
# all_point_x = points[:, 0].T 
# all_point_y = points[:, 1].T

# print(all_point_x.shape)

# plotter = GraphGUI()
# plotter.x = all_point_x
# plotter.y = all_point_y
# plotter.DBSCAN_2d_tuner(render="browser")