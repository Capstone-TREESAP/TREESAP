# segmentation
---
This is a document on unlabelled data segmentation
**Please note that the current unlabelled LiDAR pipeline is not completed, as it will not be able to generate a geojosn file for the whole campus.**. However, all the components needed to archive this goal is already presented and tested.
## Requirements
We are using UBC's 2015 LiDAR dataset as example
1. LiDAR data (in LAS or LAZ format): [link](https://abacus.library.ubc.ca/dataset.xhtml?persistentId=hdl:11272.1/AB2/KET75X)
2. DEM data: [link](https://abacus.library.ubc.ca/dataset.xhtml?persistentId=hdl:11272.1/AB2/2FKBA6)
3. TIF data: [link](https://abacus.library.ubc.ca/dataset.xhtml?persistentId=hdl:11272.1/AB2/KIZZ4L)

For API reason, we could not get the api feature integrated from Abacus library. User will have to manually download the files. There is a script to help with unzipping files (see `download.py/unzip_files(src_dir)`)

Here are some of the smaller requirements for formatting the dataset:
1. filename has the follow the convention: XXXXE_XXXXXN. For example, 4810E_54560N.las
2. check file's data format. LAS file should use UTM format. DEM uses xyz format, and TIF files uses RGB format (no alpha)

## To do
1. stitch all the TIF files into one
2. stitch all the processed LiDAR point cloud into one
