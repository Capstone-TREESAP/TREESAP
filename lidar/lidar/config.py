from enum import IntEnum
class CONSTANT:
    DOWN_SIZE = 1000
    TILE_MAX_SIZE = 100000 
    MIN_POINTS_FOR_DOWNSIZE = 20000
    DEBUG = True
    """ the minium distances between points 
    """
    EPS = 800
    MIN_SAMPLE = 2
    MIN_SIZE = 20
    LAS_EXT = ".las"
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