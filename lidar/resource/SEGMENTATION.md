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

## Literatures
treeseg: https://besjournals.onlinelibrary.wiley.com/doi/full/10.1111/2041-210X.13121
rgb: https://www.int-arch-photogramm-remote-sens-spatial-inf-sci.net/XLII-3/1215/2018/isprs-archives-XLII-3-1215-2018.pdf

indexs: https://www.researchgate.net/publication/281845418_Fusion_of_Plant_Height_and_Vegetation_Indices_for_the_Estimation_of_Barley_Biomass

more indexing: https://www.l3harrisgeospatial.com/docs/broadbandgreenness.html#:~:text=Green%20Leaf%20Index%20(GLI),-This%20index%20was&text=GLI%20values%20range%20from%20%2D1,represent%20green%20leaves%20and%20stems.

threshold: https://www.researchgate.net/figure/Threshold-chosen-for-vegetation-indices-Vis-to-separate-canopy-and-non-canopy-areas_tbl3_337491741

## To do
1. stitch all the TIF files into one
2. stitch all the processed LiDAR point cloud into one
