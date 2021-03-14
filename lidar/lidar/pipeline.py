from processing import ProcessingPipeline

def main():
    pipeline = ProcessingPipeline()
    pipeline.pre_process_las_files("../data/2018/")
    pipeline.processing_by_map(pipeline.OUTPUT_MAP_FILE_PATH)

if __name__=="__main__":
    main()