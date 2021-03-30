import configparser

configure = configparser.ConfigParser()
CONFIG_PATH = "configs/default_config.ini"
configure.read(CONFIG_PATH)
