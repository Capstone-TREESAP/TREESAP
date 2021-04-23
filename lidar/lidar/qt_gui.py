import signal
from PyQt5.QtCore import *
from PyQt5.QtWidgets import *
from PyQt5.QtGui import *
from PyQt5.QtWebEngineWidgets import *
from PyQt5 import uic
import sys
import os
import json
import time
import numpy as np
from sklearn.cluster import DBSCAN
import cv2
import scipy.ndimage as ndimage
from math import ceil
import download
from config import configure, LABELLED_CONFIG_PATH, unlabelled_configure, UNLABELLED_CONFIG_PATH, orthophoto_configure, ORTHOPHOTO_CONFIG_PATH
from processing import ProcessingPipeline
from plotter import GraphGUI
from segmentation import SegmentationProcessor
# https://stackoverflow.com/questions/5160577/ctrl-c-doesnt-work-with-pyqt
signal.signal(signal.SIGINT, signal.SIG_DFL)


class MainWindow(QMainWindow):
    def __init__(self, *args, **kwargs):
        super(MainWindow, self).__init__(*args, **kwargs)
        uic.loadUi("../pipeline.ui", self)
        self.labelled_pipeline = None
        self.unlabelled_pipeline = None
        self.plotter = GraphGUI()
        self.timer = QElapsedTimer()

        # set keyboard shortcut to stop the program.
        self.shortcut_close = QShortcut(QKeySequence("Ctrl+Q"), self)
        self.shortcut_close.activated.connect(self.__close_app)

        self.labelled_parameter_update = False
        self.unlabelled_parameter_update = False

        self.tabWidget.setCurrentIndex(0)
        self.__on_click_reset()
        self.tabWidget.setCurrentIndex(1)
        self.__on_click_reset()
        self.tabWidget.setCurrentIndex(2)
        self.__on_click_reset()

        # labelled lidar pipeline tab
        # default dbscan related parameters
        self.pushButton_down_size_update.clicked.connect(
            self.__on_click_dbscan_update
        )
        self.pushButton_dbscan_update.clicked.connect(
            self.__on_click_dbscan_update
        )
        # default alphashape related parameters
        self.pushButton_shape_update.clicked.connect(
            self.__on_click_alphashape_update
        )

        # unlabelled lidar pipeline tab
        self.pushButton_pre_process_update_unlabel.clicked.connect(
            self.__on_click_unlabelled_pre_process_update
        )
        self.pushButton_dbscan_update_unlabel.clicked.connect(
            self.__on_click_unlabelled_dbscan_update
        )
        self.pushButton_rgbvi_update.clicked.connect(
            self.__on_click_unlabelled_rgbvi_update
        )

        # orthophoto pipeline tab
        self.pushButton_stddev.clicked.connect(
            self.__on_click_orthophoto_stddev
        )
        self.pushButton_hsv_min_update.clicked.connect(
            self.__on_click_orthophoto_hsv_update
        )
        self.pushButton_hsv_max_update.clicked.connect(
            self.__on_click_orthophoto_hsv_update
        )

        # process controll buttons connect callbacks
        self.process_control.button(QDialogButtonBox.Reset).clicked.connect(
            self.__on_click_reset
        )
        self.process_control.button(QDialogButtonBox.SaveAll).clicked.connect(
            self.__on_click_save_all
        )
        self.process_control.button(QDialogButtonBox.Apply).clicked.connect(
            self.__on_click_apply
        )
        self.process_control.button(QDialogButtonBox.Close).clicked.connect(
            self.__close_app
        )

        # set up default display information
        self.__process_output_update()
        self.__test_output_update()
        self.__tooltip_setup()

        # load the default plot
        self.webEngineView.reload()
        self.webEngineView.setUrl(
            QUrl(
                "file://"
                + os.path.abspath(
                    configure.get("Constants", "sample_plot_html_file_path")
                )
            )
        )

        self.tabWidget.setCurrentIndex(0)
        self.statusBar().showMessage("Ready")
        self.show()

    def __check_test_data(self):
        """Download the labelled testing data"""

        filename = json.loads(configure["Test"]["test_tiles"])[0]
        filepath = (
            configure["Test"]["dest_dir_path"]
            + filename
            + configure["Constants"]["las_ext"]
        )
        if not os.path.exists(filepath):
            self.statusBar().showMessage("Downloading testing data...")
            download.download_lidar_dataset(
                configure["Test"]["dest_dir_path"],
                json.loads(configure["Test"]["test_tiles"]),
            )
            download.unzip_files(configure["Test"]["dest_dir_path"])

    def __set_progressbar_value(self, value, total_cluster):
        self.progressBar.setValue(ceil(value * 100.0 / total_cluster))

    def __process_test_labelled_data(self):
        self.statusBar().showMessage("Processing...")
        # check if the testing data is downloaded
        self.__check_test_data()

        self.timer.restart()

        self.labelled_pipeline = ProcessingPipeline(notebook=True)
        self.labelled_pipeline.pre_process_las_files(
            configure["Test"]["dest_dir_path"])
        points_x, points_y = self.labelled_pipeline.collect_points_from_map()
        whole_campus_polygon_features = self.labelled_pipeline.extract_polygon_features(
            points_x, points_y, callback=self.__set_progressbar_value
        )
        self.labelled_pipeline.export_polygon_features_to_file(
            configure.get("Test", "output_map_file_path"),
            whole_campus_polygon_features,
        )

        points = np.vstack((points_x, points_y)).T

        start_time = time.perf_counter()
        clustering = DBSCAN(
            eps=configure.getfloat("Parameters", "eps"),
            min_samples=configure.getfloat("Parameters", "min_sample"),
            n_jobs=-1,
        ).fit(points)
        end_time = time.perf_counter()

        self.plotter.plot_path = configure.get(
            "Constants", "plot_html_file_path")
        self.plotter.x = points_x
        self.plotter.y = points_y
        self.plotter.label = clustering.labels_
        self.plotter.display_2d_labelled_pcd(
            100000, save_file=True, render="png")
        self.webEngineView.reload()
        self.webEngineView.setUrl(
            QUrl(
                "file://"
                + os.path.abspath(
                    configure.get("Constants", "plot_html_file_path")
                )
            )
        )

        self.__test_output_update(
            cluster_time=(end_time - start_time),
            number_of_clusters=np.amax(clustering.labels_),
            total_time=self.timer.elapsed(),
        )
        data_path = configure.get("Download", "dest_dir_path")
        self.__process_output_update(
            self.timer.elapsed()
            * self.labelled_pipeline.pre_processor.collect_las_file_from_folder(new_path=data_path),
            estimated=True
        )

        self.statusBar().showMessage("Done")

    def __process_test_unlabelled_data(self):

        self.statusBar().showMessage("Processing")
        self.timer.restart()

        self.unlabelled_pipeline = SegmentationProcessor()

        self.unlabelled_pipeline.uniform_down_k_point = unlabelled_configure.getint(
            "Parameters", "uniform_down_k_point")
        self.unlabelled_pipeline.distance_threshold = unlabelled_configure.getfloat(
            "Parameters", "distance_threshold")
        self.unlabelled_pipeline.ransac_n = unlabelled_configure.getint(
            "Parameters", "ransac_n")
        self.unlabelled_pipeline.num_iterations = unlabelled_configure.getint(
            "Parameters", "num_iterations")
        self.unlabelled_pipeline.ground_threshold = unlabelled_configure.getfloat(
            "Parameters", "ground_threshold")
        self.unlabelled_pipeline.eps = unlabelled_configure.getfloat(
            "Parameters", "eps")
        self.unlabelled_pipeline.min_points = unlabelled_configure.getint(
            "Parameters", "min_points")
        self.unlabelled_pipeline.rgbvi_threshold = unlabelled_configure.getfloat(
            "Parameters", "rgbvi_threshold")

        if self.unlabelled_parameter_update:
            self.unlabelled_parameter_update = False
            self.unlabelled_pipeline.pre_process_pc()

        self.unlabelled_pipeline.process_pc()

        self.plotter.plot_path = unlabelled_configure.get(
            "Constants", "plot_html_file_path")
        self.plotter.x = self.unlabelled_pipeline.high_vegetation[:, 0]
        self.plotter.y = self.unlabelled_pipeline.high_vegetation[:, 1]
        self.plotter.display_2d_pcd(
            1000, save_file=True, render="png")
        self.webEngineView.reload()
        self.webEngineView.setUrl(
            QUrl(
                "file://"
                + os.path.abspath(
                    unlabelled_configure.get(
                        "Constants", "plot_html_file_path")
                )
            )
        )

        self.__test_output_update(
            cluster_time=0,
            number_of_clusters=np.amax(self.unlabelled_pipeline.labels.max()),
            total_time=self.timer.elapsed(),
        )
        self.statusBar().showMessage("Done")

    @staticmethod
    def __stddev_above_threshold(x, y, window_size, threshold, im):
        r = im[x*window_size:(x+1)*window_size, y *
               window_size:(y+1)*window_size, 0:2]
        return r.std() > threshold

    @staticmethod
    def __compressed_green(x, y, window_size, green_mask):
        r = green_mask[x*window_size:(x+1)*window_size,
                       y*window_size:(y+1)*window_size]
        return r.mean() > 128

    def __process_test_orthophoto_data(self):

        self.statusBar().showMessage("Processing")
        self.timer.restart()
        
        image = cv2.imread(orthophoto_configure.get(
            "Constants", "sample_image_path"))
        g = 20
        stddev_threshold = orthophoto_configure.getfloat(
            "Parameters", "standard_deviation_threshold")
        h_min = orthophoto_configure.getfloat("Parameters", "h_min")
        s_min = orthophoto_configure.getfloat("Parameters", "s_min")
        v_min = orthophoto_configure.getfloat("Parameters", "v_min")
        h_max = orthophoto_configure.getfloat("Parameters", "h_max")
        s_max = orthophoto_configure.getfloat("Parameters", "s_max")
        v_max = orthophoto_configure.getfloat("Parameters", "v_max")

        min_colour_threshold = (h_min/360*255, s_min, v_min)
        max_colour_threshold = (h_max/360*255, s_max, v_max)
        image_size = 1000
        n = int(image_size / g)

        kernel = np.ones((g, g), np.float32)/(g*g)
        blurred_image = cv2.filter2D(image, -1, kernel)
        hsv_blurred_image = cv2.cvtColor(blurred_image, cv2.COLOR_RGB2HSV)
        mask = cv2.inRange(hsv_blurred_image,
                           min_colour_threshold, max_colour_threshold)
        blurred_image = ndimage.gaussian_filter(image, sigma=2)
        stddev_array = np.array([MainWindow.__stddev_above_threshold(
            i//n, i % n, g, stddev_threshold, blurred_image) for i in range(0, n**2)]).reshape(n, n)

        compressed_green_array = np.array([MainWindow.__compressed_green(
            i//n, i % n, g, mask) for i in range(0, n**2)]).reshape(n, n)

        green_stddev_array = np.array(
            [compressed_green_array[i//n, i % n] and stddev_array[i//n, i % n] for i in range(0, n**2)]).reshape(n, n)
        close_img = ndimage.binary_closing(green_stddev_array)
        open_img = ndimage.binary_opening(close_img)
        thresh = np.array(open_img*255, dtype=np.uint8)

        contours, hierarchy = cv2.findContours(
            thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)

        cv2.drawContours(image, contours, -1, (0, 0, 255), 3)
        cv2.imwrite(orthophoto_configure.get(
            "Test", "output_image_path"), image)

        self.plotter.plot_path = orthophoto_configure.get(
            "Constants", "plot_html_file_path")
        self.plotter.display_image(img_path=orthophoto_configure.get(
            "Test", "output_image_path"), save_file=True)

        self.webEngineView.reload()
        self.webEngineView.setUrl(
            QUrl(
                "file://"
                + os.path.abspath(
                    orthophoto_configure.get(
                        "Constants", "plot_html_file_path")
                )
            )
        )
        
        self.__test_output_update(
            cluster_time=0,
            number_of_clusters=len(contours),
            total_time=self.timer.elapsed(),
        )

    def __test_output_update(self, cluster_time=0, number_of_clusters=0, total_time=0):
        total_seconds = total_time / 1000.0
        self.label_count.setText("%d" % number_of_clusters)
        self.label_time.setText("%.3f s" % total_seconds)
        self.label_test_output.setText(
            "processing time: %.2f seconds\nnumber of clusters: %d\ntotal time: %.4f seconds"
            % (cluster_time, number_of_clusters, total_seconds)
        )

    def __process_output_update(self, total_processing_time=0, estimated=False):
        total_seconds = total_processing_time / 1000.0
        self.label_process_output.setText(
            "%s total processing time: %.2f seconds (%.2f minutes)\n"
            % ("(estimated)" if estimated else "", total_seconds, total_seconds / 60.0)
        )

    def __tooltip_setup(self):
        # labelled tooltips
        self.scrollAreaWidget_lidar_labelled.findChild(QLineEdit, "lineEdit_eps").setToolTip(
            configure.get("ToolTips", "eps")
        )
        self.scrollAreaWidget_lidar_labelled.findChild(QLineEdit, "lineEdit_down_size").setToolTip(
            configure.get("ToolTips", "down_size")
        )
        self.scrollAreaWidget_lidar_labelled.findChild(QLineEdit, "lineEdit_min_sample").setToolTip(
            configure.get("ToolTips", "min_sample")
        )
        self.scrollAreaWidget_lidar_labelled.findChild(QLineEdit, "lineEdit_alpha").setToolTip(
            configure.get("ToolTips", "alphashape_reduction")
        )
        self.scrollAreaWidget_lidar_labelled.findChild(QLineEdit, "lineEdit_min_area").setToolTip(
            configure.get("ToolTips", "min_polygon_area")
        )
        self.scrollAreaWidget_lidar_labelled.findChild(QLineEdit, "lineEdit_max_area").setToolTip(
            configure.get("ToolTips", "max_polygon_area")
        )

        # unlabelled tooltips
        self.scrollAreaWidget_lidar_unlabelled.findChild(QLineEdit, "lineEdit_uniform_k_points").setToolTip(
            unlabelled_configure.get("ToolTips", "uniform_down_k_point")
        )
        self.scrollAreaWidget_lidar_unlabelled.findChild(QLineEdit, "lineEdit_distance_threshold").setToolTip(
            unlabelled_configure.get("ToolTips", "distance_threshold")
        )
        self.scrollAreaWidget_lidar_unlabelled.findChild(QLineEdit, "lineEdit_ground_diff").setToolTip(
            unlabelled_configure.get("ToolTips", "ground_threshold")
        )
        self.scrollAreaWidget_lidar_unlabelled.findChild(QLineEdit, "lineEdit_eps_unlabel").setToolTip(
            unlabelled_configure.get("ToolTips", "eps")
        )
        self.scrollAreaWidget_lidar_unlabelled.findChild(QLineEdit, "lineEdit_min_sample_unlabel").setToolTip(
            unlabelled_configure.get("ToolTips", "min_points")
        )
        self.scrollAreaWidget_lidar_unlabelled.findChild(QLineEdit, "lineEdit_rgbvi").setToolTip(
            unlabelled_configure.get("ToolTips", "rgbvi_threshold")
        )

        # orthophoto tooltips
        self.scrollAreaWidget_orthophoto.findChild(QLineEdit, "lineEdit_stddev").setToolTip(
            orthophoto_configure.get("ToolTips", "standard_deviation_threshold"))
        self.scrollAreaWidget_orthophoto.findChild(QLineEdit, "lineEdit_h_min").setToolTip(
            orthophoto_configure.get("ToolTips", "hsv_min"))
        self.scrollAreaWidget_orthophoto.findChild(QLineEdit, "lineEdit_s_min").setToolTip(
            orthophoto_configure.get("ToolTips", "hsv_min"))
        self.scrollAreaWidget_orthophoto.findChild(QLineEdit, "lineEdit_v_min").setToolTip(
            orthophoto_configure.get("ToolTips", "hsv_min"))
        self.scrollAreaWidget_orthophoto.findChild(QLineEdit, "lineEdit_h_max").setToolTip(
            orthophoto_configure.get("ToolTips", "hsv_max"))
        self.scrollAreaWidget_orthophoto.findChild(QLineEdit, "lineEdit_s_max").setToolTip(
            orthophoto_configure.get("ToolTips", "hsv_max"))
        self.scrollAreaWidget_orthophoto.findChild(QLineEdit, "lineEdit_v_max").setToolTip(
            orthophoto_configure.get("ToolTips", "hsv_max"))

        # general tooltips
        self.label_test_output.setToolTip(
            configure.get("ToolTips", "test_output")
        )
        self.label_process_output.setToolTip(
            configure.get("ToolTips", "process_output")
        )

    def __configure_dbscan_update(self):
        down_size_value = int(self.scrollAreaWidget_lidar_labelled.findChild(
            QLineEdit, "lineEdit_down_size").text())
        if down_size_value is not configure.getint("Parameters", "down_size"):
            self.labelled_parameter_update = True
            configure.set("Parameters", "down_size", "%s" % down_size_value)

        eps_value = int(self.scrollAreaWidget_lidar_labelled.findChild(
            QLineEdit, "lineEdit_eps").text())
        if eps_value is not configure.getint("Parameters", "eps"):
            self.labelled_parameter_update = True
            configure.set("Parameters", "eps", "%s" % eps_value)

        min_sample_value = int(self.scrollAreaWidget_lidar_labelled.findChild(
            QLineEdit, "lineEdit_min_sample").text())
        if min_sample_value is not configure.getint("Parameters", "min_sample"):
            self.labelled_parameter_update = True
            configure.set("Parameters", "min_sample", "%s" % min_sample_value)

    def __configure_alphashape_update(self):
        """[summary]
        """
        min_area_value = int(self.scrollAreaWidget_lidar_labelled.findChild(
            QLineEdit, "lineEdit_min_area").text())
        if min_area_value is not configure.getint("Parameters", "min_polygon_area"):
            self.labelled_parameter_update = True
            configure.set("Parameters", "min_polygon_area",
                          "%s" % min_area_value)

        reduction_value = int(self.scrollAreaWidget_lidar_labelled.findChild(
            QLineEdit, "lineEdit_alpha").text())
        if reduction_value is not configure.getint("Parameters", "alphashape_reduction"):
            self.labelled_parameter_update = True
            configure.set("Parameters", "alphashape_reduction",
                          "%s" % reduction_value)

        max_area_value = int(self.scrollAreaWidget_lidar_labelled.findChild(
            QLineEdit, "lineEdit_max_area").text())
        if max_area_value is not configure.getint("Parameters", "max_polygon_area"):
            self.labelled_parameter_update = True
            configure.set("Parameters", "max_polygon_area",
                          "%s" % max_area_value)

    def __configure_unlabelled_pre_processing_update(self):
        min_points_value = int(self.scrollAreaWidget_lidar_unlabelled.findChild(
            QLineEdit, "lineEdit_uniform_k_points").text())
        if min_points_value is not unlabelled_configure.getint("Parameters", "uniform_down_k_point"):
            self.unlabelled_parameter_update = True
            unlabelled_configure.set(
                "Parameters", "uniform_down_k_point", "%s" % min_points_value)

        distance_threshold_value = float(self.scrollAreaWidget_lidar_unlabelled.findChild(
            QLineEdit, "lineEdit_distance_threshold").text())
        if distance_threshold_value is not unlabelled_configure.getfloat("Parameters", "distance_threshold"):
            self.unlabelled_parameter_update = True
            unlabelled_configure.set(
                "Parameters", "distance_threshold", "%s" % distance_threshold_value)

        ground_threshold_value = float(self.scrollAreaWidget_lidar_unlabelled.findChild(
            QLineEdit, "lineEdit_ground_diff").text())
        if ground_threshold_value is not unlabelled_configure.getfloat("Parameters", "ground_threshold"):
            self.unlabelled_parameter_update = True
            unlabelled_configure.set(
                "Parameters", "ground_threshold", "%s" % ground_threshold_value)

    def __configure_unlabelled_dbscan_update(self):
        eps_value = float(self.scrollAreaWidget_lidar_unlabelled.findChild(
            QLineEdit, "lineEdit_eps_unlabel").text())
        if eps_value is not unlabelled_configure.getfloat("Parameters", "eps"):
            unlabelled_configure.set("Parameters", "eps", "%s" % eps_value)

        min_points_value = int(self.scrollAreaWidget_lidar_unlabelled.findChild(
            QLineEdit, "lineEdit_min_sample_unlabel").text())
        if min_points_value is not unlabelled_configure.getint("Parameters", "min_points"):
            unlabelled_configure.set(
                "Parameters", "min_points", "%s" % min_points_value)

    def __configure_unlabelled_rgbvi_update(self):
        rgbvi_threshold_value = float(self.scrollAreaWidget_lidar_unlabelled.findChild(
            QLineEdit, "lineEdit_rgbvi").text())
        if rgbvi_threshold_value is not unlabelled_configure.getfloat("Parameters", "rgbvi_threshold"):
            unlabelled_configure.set(
                "Parameters", "rgbvi_threshold", "%s" % rgbvi_threshold_value)

    def __configure_orthophoto_stddev(self):
        stddev_value = float(self.scrollAreaWidget_orthophoto.findChild(
            QLineEdit, "lineEdit_stddev").text())
        if stddev_value is not orthophoto_configure.getfloat("Parameters", "standard_deviation_threshold"):
            orthophoto_configure.set(
                "Parameters", "standard_deviation_threshold", "%s" % stddev_value)

    def __configure_orthophoto_hsv_update(self):
        h_min_value = float(self.scrollAreaWidget_orthophoto.findChild(
            QLineEdit, "lineEdit_h_min").text())
        if h_min_value is not orthophoto_configure.getfloat("Parameters", "h_min"):
            orthophoto_configure.set(
                "Parameters", "h_min", "%s" % h_min_value)
        s_min_value = float(self.scrollAreaWidget_orthophoto.findChild(
            QLineEdit, "lineEdit_s_min").text())
        if s_min_value is not orthophoto_configure.getfloat("Parameters", "s_min"):
            orthophoto_configure.set(
                "Parameters", "s_min", "%s" % s_min_value)
        v_min_value = float(self.scrollAreaWidget_orthophoto.findChild(
            QLineEdit, "lineEdit_v_min").text())
        if v_min_value is not orthophoto_configure.getfloat("Parameters", "v_min"):
            orthophoto_configure.set(
                "Parameters", "v_min", "%s" % v_min_value)

        h_max_value = float(self.scrollAreaWidget_orthophoto.findChild(
            QLineEdit, "lineEdit_h_min").text())
        if h_max_value is not orthophoto_configure.getfloat("Parameters", "h_min"):
            orthophoto_configure.set(
                "Parameters", "h_min", "%s" % h_max_value)
        s_max_value = float(self.scrollAreaWidget_orthophoto.findChild(
            QLineEdit, "lineEdit_s_min").text())
        if s_max_value is not orthophoto_configure.getfloat("Parameters", "s_min"):
            orthophoto_configure.set(
                "Parameters", "s_min", "%s" % s_max_value)
        v_max_value = float(self.scrollAreaWidget_orthophoto.findChild(
            QLineEdit, "lineEdit_v_min").text())
        if v_max_value is not orthophoto_configure.getfloat("Parameters", "v_min"):
            orthophoto_configure.set(
                "Parameters", "v_min", "%s" % v_max_value)

    # labelled pipeline buttons slots

    @pyqtSlot()
    def __on_click_dbscan_update(self):
        self.__configure_dbscan_update()
        self.__process_test_labelled_data()

    @pyqtSlot()
    def __on_click_alphashape_update(self):
        self.__configure_alphashape_update()
        self.__process_test_labelled_data()

    # unlabelled pipeline buttons slots
    @pyqtSlot()
    def __on_click_unlabelled_pre_process_update(self):
        self.__configure_unlabelled_pre_processing_update()
        self.__process_test_unlabelled_data()

    @pyqtSlot()
    def __on_click_unlabelled_dbscan_update(self):
        self.__configure_unlabelled_dbscan_update()
        self.__process_test_unlabelled_data()

    @pyqtSlot()
    def __on_click_unlabelled_rgbvi_update(self):
        self.__configure_unlabelled_rgbvi_update()
        self.__process_test_unlabelled_data()

    # orthophoto pipeline buttons slot
    @pyqtSlot()
    def __on_click_orthophoto_stddev(self):
        self.__configure_orthophoto_stddev()
        self.__process_test_orthophoto_data()

    @pyqtSlot()
    def __on_click_orthophoto_hsv_update(self):
        self.__configure_orthophoto_hsv_update()
        self.__process_test_orthophoto_data()

    # processing button slots
    @pyqtSlot()
    def __on_click_save_all(self):
        if self.tabWidget.currentIndex() == 0:
            self.__configure_dbscan_update()
            self.__configure_alphashape_update()
            with open(LABELLED_CONFIG_PATH, "w") as configfile:
                configure.write(configfile)
        elif self.tabWidget.currentIndex() == 1:
            self.__on_click_unlabelled_pre_process_update()
            self.__on_click_unlabelled_dbscan_update()
            self.__on_click_unlabelled_rgbvi_update()
            with open(UNLABELLED_CONFIG_PATH, "w") as configfile:
                unlabelled_configure.write(configfile)
        elif self.tabWidget.currentIndex() == 2:
            self.__on_click_orthophoto_stddev()
            self.__on_click_orthophoto_hsv_update()
            with open(ORTHOPHOTO_CONFIG_PATH, "w") as configfile:
                orthophoto_configure.write(configfile)
        self.statusBar().showMessage("Saved all parameters")

    @pyqtSlot()
    def __on_click_reset(self):
        if self.tabWidget.currentIndex() == 0:
            configure.read(LABELLED_CONFIG_PATH)
            self.scrollAreaWidget_lidar_labelled.findChild(QLineEdit, "lineEdit_down_size").setText(
                configure.get("Parameters", "down_size"))
            self.scrollAreaWidget_lidar_labelled.findChild(QLineEdit, "lineEdit_eps").setText(
                configure.get("Parameters", "eps"))
            self.scrollAreaWidget_lidar_labelled.findChild(QLineEdit, "lineEdit_min_sample").setText(
                configure.get("Parameters", "min_sample"))

            self.scrollAreaWidget_lidar_labelled.findChild(QLineEdit, "lineEdit_test_dir_path").setText(
                configure.get("Test", "dest_dir_path"))
            self.scrollAreaWidget_lidar_labelled.findChild(QLineEdit, "lineEdit_data_dir_path").setText(
                configure.get("Download", "dest_dir_path"))

            self.scrollAreaWidget_lidar_labelled.findChild(QLineEdit, "lineEdit_min_area").setText(
                configure.get("Parameters", "min_polygon_area"))
            self.scrollAreaWidget_lidar_labelled.findChild(QLineEdit, "lineEdit_alpha").setText(configure.get(
                "Parameters", "alphashape_reduction"))
            self.scrollAreaWidget_lidar_labelled.findChild(QLineEdit, "lineEdit_max_area").setText(configure.get(
                "Parameters", "max_polygon_area"))

        elif self.tabWidget.currentIndex() == 1:
            unlabelled_configure.read(UNLABELLED_CONFIG_PATH)
            self.scrollAreaWidget_lidar_unlabelled.findChild(QLineEdit, "lineEdit_uniform_k_points").setText(
                unlabelled_configure.get("Parameters", "uniform_down_k_point"))
            self.scrollAreaWidget_lidar_unlabelled.findChild(QLineEdit, "lineEdit_ground_diff").setText(
                unlabelled_configure.get("Parameters", "ground_threshold"))
            self.scrollAreaWidget_lidar_unlabelled.findChild(QLineEdit, "lineEdit_distance_threshold").setText(
                unlabelled_configure.get("Parameters", "distance_threshold"))

            self.scrollAreaWidget_lidar_unlabelled.findChild(QLineEdit, "lineEdit_eps_unlabel").setText(
                unlabelled_configure.get("Parameters", "eps"))
            self.scrollAreaWidget_lidar_unlabelled.findChild(QLineEdit, "lineEdit_min_sample_unlabel").setText(
                unlabelled_configure.get("Parameters", "min_points"))

            self.scrollAreaWidget_lidar_unlabelled.findChild(QLineEdit, "lineEdit_rgbvi").setText(
                unlabelled_configure.get("Parameters", "rgbvi_threshold"))
            self.scrollAreaWidget_lidar_unlabelled.findChild(QLineEdit, "lineEdit_data_dir_path_unlabel").setText(unlabelled_configure.get(
                "Test", "las_file_path"))
            self.scrollAreaWidget_lidar_unlabelled.findChild(QLineEdit, "lineEdit_test_dir_path_unlabel").setText(unlabelled_configure.get(
                "Test", "pcd_output_path"))
            self.scrollAreaWidget_lidar_unlabelled.findChild(QLineEdit, "lineEdit_output_dir_path_unlabel").setText(unlabelled_configure.get(
                "Test", "las_file_output_path"))

        elif self.tabWidget.currentIndex() == 2:
            orthophoto_configure.read(ORTHOPHOTO_CONFIG_PATH)
            self.scrollAreaWidget_orthophoto.findChild(QLineEdit, "lineEdit_stddev").setText(
                orthophoto_configure.get("Parameters", "standard_deviation_threshold"))

            self.scrollAreaWidget_orthophoto.findChild(QLineEdit, "lineEdit_h_min").setText(
                orthophoto_configure.get("Parameters", "h_min"))
            self.scrollAreaWidget_orthophoto.findChild(QLineEdit, "lineEdit_s_min").setText(
                orthophoto_configure.get("Parameters", "s_min"))
            self.scrollAreaWidget_orthophoto.findChild(QLineEdit, "lineEdit_v_min").setText(
                orthophoto_configure.get("Parameters", "v_min"))
            self.scrollAreaWidget_orthophoto.findChild(QLineEdit, "lineEdit_h_max").setText(
                orthophoto_configure.get("Parameters", "h_max"))
            self.scrollAreaWidget_orthophoto.findChild(QLineEdit, "lineEdit_s_max").setText(
                orthophoto_configure.get("Parameters", "s_max"))
            self.scrollAreaWidget_orthophoto.findChild(QLineEdit, "lineEdit_v_max").setText(
                orthophoto_configure.get("Parameters", "v_max"))
        self.statusBar().showMessage("Reset all parameters")

    @pyqtSlot()
    def __on_click_apply(self):
        """[summary]
        """
        if self.tabWidget.currentIndex() == 0:
            self.statusBar().showMessage("Started data processing ...")

            self.timer.restart()

            data_path = configure["Download"]["dest_dir_path"]
            self.labelled_pipeline = ProcessingPipeline(notebook=True)
            if self.labelled_parameter_update:
                self.labelled_pipeline.reload = True
                self.labelled_parameter_update = False
            self.labelled_pipeline.pre_process_las_files(data_path)
            self.labelled_pipeline.collect_points_from_map()
            whole_campus_polygon_features = self.labelled_pipeline.extract_polygon_features(
                callback=self.__set_progressbar_value)
            self.labelled_pipeline.export_polygon_features_to_file(
                configure.get("Constants", "OUTPUT_MAP_FILE_PATH"),
                whole_campus_polygon_features,
            )

            self.__process_output_update(self.timer.elapsed(), estimated=False)
            self.statusBar().showMessage("Complete data processing")
        elif self.tabWidget.currentIndex() == 1:
            pass

    @pyqtSlot()
    def __close_app(self):
        app.quit()


if __name__ == "__main__":
    app = QApplication(sys.argv)
    # app.setStyle("Oxygen")
    window = MainWindow()

    app.exec_()
