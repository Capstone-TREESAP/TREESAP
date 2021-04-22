import configparser

configure = configparser.ConfigParser()
unlabelled_configure = configparser.ConfigParser()

LABELLED_CONFIG_PATH = "configs/labelled_config.ini"
UNLABELLED_CONFIG_PATH = "configs/unlabelled_config.ini"
configure.read(LABELLED_CONFIG_PATH)
unlabelled_configure.read(UNLABELLED_CONFIG_PATH)
