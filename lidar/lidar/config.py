import configparser
configure = configparser.ConfigParser()
CONFIG_PATH = 'configs/default_config.ini'
configure.read(CONFIG_PATH)

# run out of time to improve the config
class CONSTANT:
    DOWN_SIZE = 100
    """
    100,000 cm = 1000 m = 1km
    """
    TILE_MAX_SIZE = 100000 
    MIN_POINTS_FOR_DOWNSIZE = 100000
    DEBUG = True
    """ the minium distances between points 
    """
    EPS = 1000
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