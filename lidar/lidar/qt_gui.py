from PyQt5.QtCore import *
from PyQt5.QtWidgets import *
from PyQt5.QtGui import *
from PyQt5.QtWebEngineWidgets import *
from PyQt5 import uic
import sys
import os
import json
import download
from config import configure
from processing import ProcessingPipeline

class MainWindow(QMainWindow):
    def __init__(self, *args, **kwargs):
        super(MainWindow,self).__init__(*args, **kwargs)
        uic.loadUi("../pipeline.ui", self)
        self.pipeline = None 
        # self.browser = QWebEngineView()
        # self.webEngineView.setUrl(QUrl("file:///home/yiyi/Documents/myrepo/github/CEDAR/lidar/lidar/your_filename.html"))
        self.pushButton_down_size_update.clicked.connect(self.on_click_down_size_update)
        
        self.__check_test_data()
        self.show()
        
    def __check_test_data(self):
        # check if test data exist
        filename = json.loads(configure['Test']['test_tiles'])[0]
        filepath = configure['Test']['dest_dir_path'] + filename + configure['Constants']['LAS_EXT']
        if not os.path.exists(filepath):
            self.label_output.setText("Downloading test data...")
            download.download_lidar_dataset(configure['Test']['dest_dir_path'] , json.loads(configure['Test']['test_tiles']))
            download.unzip_files(configure['Test']['dest_dir_path'])
            self.label_output.setText("Test data downloaded")
        else:
            self.label_output.setText("Test data already downloaded")
    
    def __process_with_default_value(self):
        pipeline = ProcessingPipeline()
        pipeline.pre_process_las_files(configure['Test']['dest_dir_path'])
    @pyqtSlot()
    def on_click_down_size_update(self):
        pass
if __name__=="__main__":
    app = QApplication(sys.argv)
    app.setStyle('Fusion')
    window = MainWindow()

    app.exec_()