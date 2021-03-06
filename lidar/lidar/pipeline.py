from processing import ProcessingPipeline

def main():
    pipeline = ProcessingPipeline()
    pipeline.pre_process_las_files("../data/2018/")
    pipeline.processing_by_file("tile.geojson")
    pipeline.processing_by_map("map.geojson")
if __name__=="__main__":
    main()