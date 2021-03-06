from config import CONSTANT, LiDARIndexType
import os
import ntpath
import fnmatch, re
import numpy as np
from laspy.file import File


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

class PreProcessor(CONSTANT):
    """ preprocessing class that will extract point in x, y coordinate from the las file, 
    and transform them relative to the tile at the corner, so that the whole map are using 
    the same utm coordinate. 

    Args:
        CONSTANT (class): Global constant class
    """
    def __init__(self, data_dir):
        self.data_dir = data_dir
        self.lasfile_list = None
        self.__collect_las_file_from_folder()
        self.min_east = None # the most west tile
        self.min_north = None # the most south tile
        self.min_filepath = None 
        self.__find_the_corner_tile()
    
    def __collect_las_file_from_folder(self):
        """ Collect all the las file from the input folder. It will only look
        for .las extension. 
        """
        self.lasfile_list = []
        for root, dirs, files in os.walk(self.data_dir):
            for file in files:
                if file.endswith(self.LAS_EXT):
                    file_path = os.path.join(root, file)
                    self.lasfile_list.append(LasFile(file_path))
        if self.DEBUG:
            print("Found total of %d las files." % (len(self.lasfile_list)))
    
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
        if self.DEBUG:
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
        if self.DEBUG:
            print("Loading file %s." % (las_file.file_path))
            
        inFile = File(las_file.file_path, mode='r')

        I = inFile.Classification == index_type

        test = inFile.points[I]
        
        if test.shape[0] == 0:
            raise LookupError
        
        if test.shape[0] > self.MIN_POINTS_FOR_DOWNSIZE:
            # down sample the point cloud if there are too many points to speed up the processing
            sample = np.random.choice(test, int(test.shape[0]/self.DOWN_SIZE))
        else:
            sample = test
        x = np.zeros(sample.shape[0])
        y = np.zeros(sample.shape[0])
        z = np.zeros(sample.shape[0])
        
        for i in np.arange(0, sample.shape[0]):
            x[i] = sample[i][0][0]
            y[i] = sample[i][0][1]
            z[i] = sample[i][0][2]
        
        # scale the map to 0-10k
        # the reason for scaling is to save points as integer, and avoid large number, so that the clustering is faster.
        x_min = (las_file.east - 4000 ) * 10000
        y_min = (las_file.north - 50000 ) * 10000
        
        x_scaled = x - x_min
        y_scaled = y - y_min

        # transform the points relative to the min_east and north
        x_transformed = x_scaled + (las_file.east - self.min_east) /10 * self.TILE_MAX_SIZE
        y_transformed = y_scaled + (las_file.north - self.min_north)/10 * self.TILE_MAX_SIZE
        
        return x_transformed, y_transformed
            


    
    

