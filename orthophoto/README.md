# Orthophoto

---

## Tiles in question

[link](https://abacus.library.ubc.ca/dataverse/abacus-open?q=orthophoto&fq2=producerName_ss%3A%22University+of+British+Columbia.+Campus+and+Community+Planning.%22&fq0=subtreePaths%3A%22%2F2746%22&fq1=dvObjectType%3A%28dataverses+OR+datasets+OR+files%29&types=dataverses%3Adatasets%3Afiles&sort=score&order=)

*bold in higher priority*

- **481E 5457N**
- **481E 5456N**
  - 
- 482E 5457N
- **482E 5456N**
- 482E 5455N

each tile is 

- 1km X 1km

### Approach 1: Filter

- exif tags are empty
- Use color picker: https://www.rapidtables.com/web/color/RGB_Color.html
  - find the color thresh that can filter the green
  - there is light green and deep green, 

#### Conclusion

- sensitive to noise and season
- cant handle ocean very well. Cause ocean is kind of green?
- 

### Approach 2: ML

https://medium.com/descarteslabs-team/descartes-labs-urban-trees-tree-canopy-mapping-3b6c85c5c9cc

- use LiDAR data to train ML model

## TODO

- [ ] use `wget` for images download
- [ ] write some basic potery commands



# LIDAR

## CoV

https://opendata.vancouver.ca/explore/dataset/lidar-2018/information/

## UBC

