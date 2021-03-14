from enum import IntEnum
class CONSTANT:
    DOWN_SIZE = 100
    """
    100,000 cm = 1000 m = 1km
    """
    TILE_MAX_SIZE = 100000 
    MIN_POINTS_FOR_DOWNSIZE = 20000
    DEBUG = True
    """ the minium distances between points 
    """
    EPS = 300
    MIN_SAMPLE = 10
    MIN_SIZE = 20
    LAS_EXT = ".las"
    DEFAULT_ALPHA_SHAPE = 0.0
    MIN_POLYGON_AREA = (15 * 100) ** 2.0
    ALPHA_SHAPE_MULTIPOLYGON_TYPE = 'MultiPolygon'
    ALPHA_SHAPE_POLYGON_TYPE = 'Polygon'
    PKL_FILE_PATH = 'points.pkl'
    OUTPUT_MAP_FILE_PATH = '../tests/map.geojson'
    OUTPUT_TILE_FILE_PATH = '../tests/tile.geojson'

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