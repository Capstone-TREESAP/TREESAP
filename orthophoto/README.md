# Orthophoto Data Processing Pipeline
This is a user guide for using the data processing pipeline that can process orthophoto or LiDAR datasets into a geojson representing the location of tree cover. The pipeline is located in the LiDAR and orthophoto folders in the repository: https://github.com/Capstone-TREESAP/TREESAP. The command line interface provides an easy way to run the pipelines from the command line for advanced users. It is designed to work on Ubuntu 18 or Ubuntu 20.

## Setup
The orthophoto directory contains a requirements.txt with all the required dependencies. The dependencies can be installed by running `pip install -r requirements.txt`.

## Running the script
The script, orthophoto\_to\_geojson.py, takes many arguments: 
    1. The directory containing all the tif and tfw
    2. The bounding polygon to check for intersections with
    3. The file to output the intersecting polygons to, should end in .geojson
    4. The ID prefix in the form initial-year, e.g. O-2016 for 2016 orthophoto
    5. The standard deviation threshold
    6-11.  [optional] The HSV of the min segmentation colour, followed by the HSV of the max segmentation colour

## Example
If you wish to process the 2016 orthophoto data and have the following configuration:
1. The TIF and TFW files are in the folder input\_path/orthophoto/2016/
2. You want to keep all polygons within the UBC campus, the boundary of which is in the file input\_path/ubcv\_legal\_boundary.geojson
3. You want the results of the pipeline to be in the folder output\_path/orthophoto/2016, in a file called orthophoto\_tree\_cover.geojson
4. The standard deviation threshold is 10, minimum threshold colour in HSV is (35, 30, 0), and maximum threshold colour in HSV is (270, 255, 150)
Then you should run:

```
python3 orthophoto_to_geojson.py input_path/orthophoto/2016 input_path/ubcv_legal_boundary.geojson output_path/orthophoto/2016/tree_cover.geojson O-2016 10 35 30 0 270 255 150
```
