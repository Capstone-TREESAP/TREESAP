import configparser

configure = configparser.ConfigParser()
unlabelled_configure = configparser.ConfigParser()
orthophoto_configure = configparser.ConfigParser()

LABELLED_CONFIG_PATH = "configs/labelled_config.ini"
UNLABELLED_CONFIG_PATH = "configs/unlabelled_config.ini"
ORTHOPHOTO_CONFIG_PATH = "configs/orthophoto_config.ini"

configure.read(LABELLED_CONFIG_PATH)
unlabelled_configure.read(UNLABELLED_CONFIG_PATH)
orthophoto_configure.read(ORTHOPHOTO_CONFIG_PATH)
