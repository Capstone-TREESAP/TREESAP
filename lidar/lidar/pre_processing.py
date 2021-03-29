from config import configure
from enum import IntEnum
import os
import ntpath
import fnmatch, re
import numpy as np
from laspy.file import File
from config import configure

class LiDARIndexType(IntEnum):
    UNCLASSIFIED = 1
    BARE_EARTH_AND_LOW_GRASS = 2
    LOW_VEGETATION = 3
    """It's supposed to be WATER = 5. HIGH_VEGETATION = 4, but in 
    CoV 2018 dataset it's reversed: https://opendata.vancouver.ca/explore/dataset/lidar-2018/information/
    """
    WATER = 4
    HIGH_VEGETATION = 5
    # WATER = 5
    BUILDINGS = 6
    OTHERS = 7
    NOISE = 8
    
class LasFile:
    """ Object containing the info about the las file.
    """
    def __init__(self, file_path):
        self._file_path = file_path
        self._east, self._north = LasFile.extract_utm_from_file_name(self._file_path) 
        self._point_x = np.array([])
        self._point_y = np.array([])
        # self.point_z = None
        self.valid = False
    @property
    def point_x(self):
        return self._point_x
    @property
    def point_y(self):
        return self._point_y
    @property
    def north(self):
        return self._north
    @property
    def east(self):
        return self._east
    @property
    def file_path(self):
        return self._file_path
        
    @point_x.setter
    def point_x(self, point_x):
        self._point_x = point_x
    @point_y.setter
    def point_y(self, point_y):
        self._point_y = point_y
    
    @staticmethod
    def extract_utm_from_file_name(file_path):
        """ Extract the UTM global coordinate from file path

        Args:
            file_path (str): full file path or file name of the las file

        Returns:
            int, int: east and north of utm coordinate from the file name
        """
        filename = ntpath.basename(file_path)
        regex = re.compile(r'\d+')
        east, north = regex.findall(filename)
        return int(east), int(north)

class PreProcessor():
    """ preprocessing class that will extract point in x, y coordinate from the las file, 
    and transform them relative to the tile at the corner, so that the whole map are using 
    the same utm coordinate. 
    """
    def __init__(self, data_dir):
        self.data_dir = data_dir
        self.lasfile_list = None
        self.collect_las_file_from_folder()
        self.min_east = None # the most west tile
        self.min_north = None # the most south tile
        self.min_filepath = None 
        self.__find_the_corner_tile()
    
    def collect_las_file_from_folder(self, new_path=None):
        """ Collect all the las file from the input folder. It will only look
        for .las extension. 
        """
        self.lasfile_list = []
        path = self.data_dir
        if new_path is not None:
            path = new_path
        for root, dirs, files in os.walk(path):
            for file in files:
                if file.endswith(configure.get('Constants', 'las_ext')):
                    file_path = os.path.join(root, file)
                    self.lasfile_list.append(LasFile(file_path))
        if configure.getboolean('Configure', 'debug'):
            print("Found total of %d las files." % (len(self.lasfile_list)))
        return len(self.lasfile_list)
    
    def __find_the_corner_tile(self):
        """ Find the tile at the south west corner. Note that the utm coodinate 
        are referenced from buttom-left corner
        """
        self.min_east, self.min_north = np.inf, np.inf
        self.min_filepath = ""
        for las_file in self.lasfile_list:
            if (las_file.east <= self.min_east and las_file.north <= self.min_north):
                self.min_filepath = las_file.file_path
                self.min_east = las_file.east
                self.min_north = las_file.north
        if configure.getboolean('Configure', 'debug'):
            print("The corner tile is file %s at %d %d" % (self.min_filepath, self.min_east, self.min_north))
                
    def extract_relative_las_data(self, las_file, index_type = LiDARIndexType.HIGH_VEGETATION):
        """ Extract all the point in x and y frame, and transform them relative to the minium utm coordinate

        Args:
            las_file (LasFile): input las file object
            index_type (int, optional): the las index to filter the point cloud with. Defaults to LiDARIndexType.HIGH_VEGETATION.

        Raises:
            LookupError: there is no point in the given index_type

        Returns:
            np.array, np.array: the transformed points in x frame, the transformed points in y frame. 
        """
        if configure.getboolean('Configure', 'debug'):
            print("Loading file %s." % (las_file.file_path))
            
        inFile = File(las_file.file_path, mode='r')

        I = inFile.Classification == index_type

        test = inFile.points[I]
        
        if test.shape[0] == 0:
            raise LookupError
        
        sample = test
        if test.shape[0] > configure.getint('Parameters', 'min_points_for_downsize'):
            # down sample the point cloud if there are too many points to speed up the processing
            sample = np.random.choice(test, int(test.shape[0]/configure.getint('Parameters', 'down_size')))
        # if test.shape[0] > configure.getint('Parameters', 'MIN_POINTS_FOR_DOWNSIZE'):
        #     # down sample the point cloud if there are too many points to speed up the processing
        #     reduce_to_ideal_size = lambda x : int(x) if x <= configure.getint('Parameters', 'MIN_POINTS_FOR_DOWNSIZE') else reduce_to_ideal_size(x/10)
        #     desired_size = reduce_to_ideal_size(test.shape[0])
        #     print("Down size to %d from %d" % (desired_size, test.shape[0]))
        #     sample = np.random.choice(test, desired_size)
            
        x = np.zeros(sample.shape[0])
        y = np.zeros(sample.shape[0])
        z = np.zeros(sample.shape[0])
        
        for i in np.arange(0, sample.shape[0]):
            x[i] = sample[i][0][0]
            y[i] = sample[i][0][1]
            z[i] = sample[i][0][2]
        
        # scale the map to 0-10k
        # the reason for scaling is to save points as integer, and avoid large number, so that the clustering is faster.
        x_min = (las_file.east - configure.getint('Constants', 'east_offset') ) * configure.getint('Constants', 'tile_scale')
        y_min = (las_file.north - configure.getint('Constants', 'north_offset') ) * configure.getint('Constants', 'tile_scale')
        
        x_scaled = x - x_min
        y_scaled = y - y_min

        # transform the points relative to the min_east and north
        x_transformed = x_scaled + (las_file.east - self.min_east) * configure.getint('Constants', 'tile_scale')
        y_transformed = y_scaled + (las_file.north - self.min_north) * configure.getint('Constants', 'tile_scale')
        
        return x_transformed, y_transformed

