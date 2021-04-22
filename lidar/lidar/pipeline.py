from processing import ProcessingPipeline
from config import configure


def main():
    pipeline = ProcessingPipeline(notebook=False)
    pipeline.pre_process_las_files(configure["Download"]["dest_dir_path"])
    points_x, points_y = pipeline.collect_points_from_map()
    whole_campus_polygon_features = pipeline.extract_polygon_features(
        points_x, points_y
    )
    pipeline.export_polygon_features_to_file(
        configure.get("Constants", "OUTPUT_MAP_FILE_PATH"),
        whole_campus_polygon_features,
    )


if __name__ == "__main__":
    main()
