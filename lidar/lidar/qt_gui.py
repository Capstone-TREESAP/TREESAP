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
from gui import GraphGUI
from sklearn.cluster import DBSCAN
import signal

signal.signal(signal.SIGINT, signal.SIG_DFL)

class MainWindow(QMainWindow):
    def __init__(self, *args, **kwargs):
        super(MainWindow,self).__init__(*args, **kwargs)
        uic.loadUi("../pipeline.ui", self)
        self.pipeline = None 
        self.browser = QWebEngineView()
        self.__set_default_value()
        
        self.shortcut_close = QShortcut(QKeySequence('Ctrl+Q'), self)
        self.shortcut_close.activated.connect(self.__close_app)
        # self.webEngineView.setUrl(QUrl("file:///home/yiyi/Documents/myrepo/github/CEDAR/lidar/lidar/your_filename.html"))
        self.pushButton_down_size_update.clicked.connect(self.__on_click_down_size_update)
        self.pushButton_eps_update.clicked.connect(self.__on_click_eps_update)
        self.pushButton_min_sample_update.clicked.connect(self.__on_click_min_sample_update)
        
        self.plotter = GraphGUI()
        self.__check_test_data()
        self.show()
        
    def __check_test_data(self):
        # check if test data exist
        filename = json.loads(configure['Test']['test_tiles'])[0]
        filepath = configure['Test']['dest_dir_path'] + filename + configure['Constants']['las_ext']
        if not os.path.exists(filepath):
            download.download_lidar_dataset(configure['Test']['dest_dir_path'] , json.loads(configure['Test']['test_tiles']))
            download.unzip_files(configure['Test']['dest_dir_path'])
    
    def __set_default_value(self):
        self.LineEdit_downsize.setText(configure.get('Parameters', 'down_size'))
        self.lineEdit_eps.setText(configure.get('Parameters', 'eps'))
        self.lineEdit_min_sample.setText(configure.get('Parameters', 'min_sample'))
        self.lineEdit_test_dir_path.setText(configure.get('Test', 'dest_dir_path'))
        self.lineEdit_data_dir_path.setText(configure.get('Download', 'dest_dir_path'))
        
    def __set_progressbar_value(self, value, total_cluster):
        self.progressBar.setValue(int(value * 100.0 /total_cluster))
        
    def __process_test_data(self):
        self.statusBar().showMessage('Processing...')
        start_process = time.perf_counter()

        pipeline = ProcessingPipeline(notebook=True)
        pipeline.pre_process_las_files(configure['Test']['dest_dir_path'])
        points_x, points_y = pipeline.processing_by_map(configure.get('Constants', 'OUTPUT_MAP_FILE_PATH'), callback=self.__set_progressbar_value)
        points = np.vstack((points_x, points_y)).T
        
        start_time = time.perf_counter()
        clustering = DBSCAN(eps=configure.getfloat('Parameters', 'eps'), min_samples=configure.getfloat('Parameters', 'min_sample'), n_jobs=-1).fit(points)
        end_time = time.perf_counter()
        
        self.plotter.x = points_x
        self.plotter.y = points_y
        self.plotter.label = clustering.labels_
        # self.plotter.display_2d_labelled_pcd(100000, save_file=True, render="png")
        self.webEngineView.reload()
        self.webEngineView.setUrl(QUrl("file://" + os.path.abspath(configure.get("Constants", "plot_html_file_path"))))
        
        end_process = time.perf_counter()
        self.__test_output_update(cluster_time=(end_time - start_time), number_of_clusters=np.amax(clustering.labels_), total_time=(end_process - start_process))
        data_path = configure.get('Download','dest_dir_path')
        self.__process_output_update((end_process - start_process) * pipeline.pre_processor.collect_las_file_from_folder(new_path=data_path))
        
        self.statusBar().showMessage('Done')
    
    def __test_output_update(self, cluster_time=0, number_of_clusters=0, total_time = 0):
        self.label_test_output.setText("processing time: %.4f seconds\nnumber of clusters: %d\ntotal time: %.4f seconds" % (cluster_time, number_of_clusters, total_time))
    
    def __process_output_update(self, total_processing_time=0):
        self.label_process_output.setText("estimated total processing time: %.4f seconds or %.4f minutes\n" % (total_processing_time, total_processing_time/60.0))
    """[summary]
    """
    @pyqtSlot()
    def __on_click_down_size_update(self):
        down_size_value = int(self.LineEdit_downsize.text())
        self.__process_test_data()
        if down_size_value is not configure.get('Parameters', 'down_size'):
            configure.set('Parameters', 'down_size', "%s" % down_size_value)
            with open(CONFIG_PATH, 'w') as configfile:
                configure.write(configfile)
    @pyqtSlot()
    def __on_click_eps_update(self):
        eps_value = int(self.lineEdit_eps.text())
        self.__process_test_data()
        if eps_value is not configure.get('Parameters', 'eps'):
            configure.set('Parameters', 'eps', "%s" % eps_value)
            with open(CONFIG_PATH, 'w') as configfile:
                configure.write(configfile)
    @pyqtSlot()
    def __on_click_min_sample_update(self):
        min_sample_value = int(self.lineEdit_eps.text())
        self.__process_test_data()
        if min_sample_value is not configure.get('Parameters', 'min_sample'):
            configure.set('Parameters', 'min_sample', "%s" % min_sample_value)
            with open(CONFIG_PATH, 'w') as configfile:
                configure.write(configfile)
    @pyqtSlot()
    def __close_app(self):
        app.quit()

if __name__=="__main__":
    app = QApplication(sys.argv)
    app.setStyle('Fusion')
    window = MainWindow()

    app.exec_()