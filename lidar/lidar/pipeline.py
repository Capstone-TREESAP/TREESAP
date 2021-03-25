from processing import ProcessingPipeline
from config import configure
def main():
    pipeline = ProcessingPipeline()
    pipeline.pre_process_las_files(configure.get('Test', 'dest_dir_path'))
    pipeline.processing_by_map(configure.get('Constants', 'OUTPUT_MAP_FILE_PATH'))

if __name__=="__main__":
    main()