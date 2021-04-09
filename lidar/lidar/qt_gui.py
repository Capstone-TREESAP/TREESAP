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
import download
from config import configure, CONFIG_PATH
from processing import ProcessingPipeline
from plotter import GraphGUI
from sklearn.cluster import DBSCAN
from math import ceil

import signal

signal.signal(signal.SIGINT, signal.SIG_DFL)


class MainWindow(QMainWindow):
    def __init__(self, *args, **kwargs):
        super(MainWindow, self).__init__(*args, **kwargs)
        uic.loadUi("../pipeline.ui", self)
        self.pipeline = None
        self.browser = QWebEngineView()
        self.__on_click_reset()
        self.timer = QElapsedTimer()

        self.shortcut_close = QShortcut(QKeySequence("Ctrl+Q"), self)
        self.shortcut_close.activated.connect(self.__close_app)

        self.pushButton_down_size_update.clicked.connect(
            self.__on_click_dbscan_update
        )
        self.pushButton_eps_update.clicked.connect(
            self.__on_click_dbscan_update
        )
        self.pushButton_min_sample_update.clicked.connect(
            self.__on_click_dbscan_update
        )

        # alphashape related parameters
        self.pushButton_shape_update.clicked.connect(
            self.__on_click_alphashape_update
        )
        self.pushButton_min_area_update.clicked.connect(
            self.__on_click_alphashape_update
        )

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

        self.__process_output_update()
        self.__test_output_update()
        self.__tooltip_setup()

        self.plotter = GraphGUI()
        self.__check_test_data()
        self.statusBar().showMessage("Ready")
        self.show()

    def __check_test_data(self):
        """[summary]"""
        filename = json.loads(configure["Test"]["test_tiles"])[0]
        filepath = (
            configure["Test"]["dest_dir_path"]
            + filename
            + configure["Constants"]["las_ext"]
        )
        if not os.path.exists(filepath):
            download.download_lidar_dataset(
                configure["Test"]["dest_dir_path"],
                json.loads(configure["Test"]["test_tiles"]),
            )
            download.unzip_files(configure["Test"]["dest_dir_path"])

    def __set_progressbar_value(self, value, total_cluster):
        """[summary]

        Args:
            value ([type]): [description]
            total_cluster ([type]): [description]
        """
        self.progressBar.setValue(ceil(value * 100.0 / total_cluster))

    def __process_test_data(self):
        """[summary]"""
        self.statusBar().showMessage("Processing...")
        self.timer.restart()

        pipeline = ProcessingPipeline(notebook=True)
        pipeline.pre_process_las_files(configure["Test"]["dest_dir_path"])
        points_x, points_y = pipeline.collect_points_from_map()
        whole_campus_polygon_features = pipeline.extract_polygon_features(
            points_x, points_y, callback=self.__set_progressbar_value
        )
        pipeline.export_polygon_features_to_file(
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
            * pipeline.pre_processor.collect_las_file_from_folder(new_path=data_path),
            estimated=True,
        )

        self.statusBar().showMessage("Done")

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
        """[summary]
        """
        self.pushButton_eps_update.setToolTip(
            configure.get("ToolTips", "eps")
        )
        self.pushButton_down_size_update.setToolTip(
            configure.get("ToolTips", "down_size")
        )
        self.pushButton_min_sample_update.setToolTip(
            configure.get("ToolTips", "min_sample")
        )
        self.pushButton_shape_update.setToolTip(
            configure.get("ToolTips", "alphashape_reduction")
        )
        self.pushButton_min_area_update.setToolTip(
            configure.get("ToolTips", "min_polygon_area")
        )
        self.pushButton_max_area.setToolTip(
            configure.get("ToolTips", "max_polygon_area")
        )
        self.label_test_output.setToolTip(
            configure.get("ToolTips", "test_output")
        )
        self.label_process_output.setToolTip(
            configure.get("ToolTips", "process_output")
        )

    def __configure_dbscan_update(self):
        """[summary]
        """
        down_size_value = int(self.LineEdit_downsize.text())
        if down_size_value is not configure.getint("Parameters", "down_size"):
            configure.set("Parameters", "down_size", "%s" % down_size_value)

        eps_value = int(self.lineEdit_eps.text())
        if eps_value is not configure.getint("Parameters", "eps"):
            configure.set("Parameters", "eps", "%s" % eps_value)

        min_sample_value = int(self.lineEdit_min_sample.text())
        if min_sample_value is not configure.getint("Parameters", "min_sample"):
            configure.set("Parameters", "min_sample", "%s" % min_sample_value)

    def __configure_alphashape_update(self):
        min_area_value = int(self.lineEdit_min_area.text())
        if min_area_value is not configure.getint("Parameters", "min_polygon_area"):
            configure.set("Parameters", "min_polygon_area",
                          "%s" % min_area_value)

        reduction_value = int(self.lineEdit_alpha.text())
        if reduction_value is not configure.getint("Parameters", "alphashape_reduction"):
            configure.set("Parameters", "alphashape_reduction",
                          "%s" % reduction_value)

        max_area_value = int(self.lineEdit_max_area.text())
        if max_area_value is not configure.getint("Parameters", "max_polygon_area"):
            configure.set("Parameters", "max_polygon_area",
                          "%s" % max_area_value)

    @pyqtSlot()
    def __on_click_dbscan_update(self):
        self.__configure_dbscan_update()
        self.__process_test_data()

    @pyqtSlot()
    def __on_click_alphashape_update(self):
        self.__configure_alphashape_update()
        self.__process_test_data()

    @pyqtSlot()
    def __on_click_save_all(self):
        self.__configure_dbscan_update()
        self.__configure_alphashape_update()
        with open(CONFIG_PATH, "w") as configfile:
            configure.write(configfile)

        self.statusBar().showMessage("Saved all parameters")

    @pyqtSlot()
    def __on_click_reset(self):
        configure.read(CONFIG_PATH)

        self.LineEdit_downsize.setText(
            configure.get("Parameters", "down_size"))
        self.lineEdit_eps.setText(configure.get("Parameters", "eps"))
        self.lineEdit_min_sample.setText(
            configure.get("Parameters", "min_sample"))

        self.lineEdit_test_dir_path.setText(
            configure.get("Test", "dest_dir_path"))
        self.lineEdit_data_dir_path.setText(
            configure.get("Download", "dest_dir_path"))

        self.lineEdit_min_area.setText(
            configure.get("Parameters", "min_polygon_area"))
        self.lineEdit_alpha.setText(configure.get(
            "Parameters", "alphashape_reduction"))
        self.lineEdit_max_area.setText(configure.get(
            "Parameters", "max_polygon_area"))
        
        self.statusBar().showMessage("Reset all parameters")

    @pyqtSlot()
    def __on_click_apply(self):
        self.statusBar().showMessage("Started data processing ...")

        self.timer.restart()

        data_path = configure["Download"]["dest_dir_path"]
        pipeline = ProcessingPipeline(notebook=True)
        pipeline.pre_process_las_files(data_path)
        points_x, points_y = pipeline.collect_points_from_map()
        whole_campus_polygon_features = pipeline.extract_polygon_features(
            points_x, points_y, callback=self.__set_progressbar_value
        )
        pipeline.export_polygon_features_to_file(
            configure.get("Constants", "OUTPUT_MAP_FILE_PATH"),
            whole_campus_polygon_features,
        )

        self.__process_output_update(self.timer.elapsed(), estimated=False)
        self.statusBar().showMessage("Complete data processing")

    @pyqtSlot()
    def __close_app(self):
        app.quit()


if __name__ == "__main__":
    app = QApplication(sys.argv)
    # app.setStyle("Oxygen")
    window = MainWindow()

    app.exec_()