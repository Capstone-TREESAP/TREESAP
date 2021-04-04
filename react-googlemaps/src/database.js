import { findIntersections } from './validation.js'

export class Database {
    constructor() {
        //TODO default values
        this.CARBON_RATE = 0;
        this.TREE_RUNOFF_RATE = 0;
        this.neighborhood_polygons = {};
        this.all_polygon_sets = {};
        this.buildings = {};
        this.ubc_boundary = {};
        this.polyKeys = {};
        this.polygons = {};
    }

    parseDatabase(database) {
        console.log(database)
        var constants = database["Calculation Constants"];
        this.CARBON_RATE = parseFloat(constants["Carbon Sequestration Rate"]);
        this.TREE_RUNOFF_RATE = parseFloat(constants["Tree Run-off Effects Rate"]);
        this.neighborhood_polygons = database["Neighborhood Polygons"];
        this.all_polygon_sets = database["Tree Cover Polygon Datasets"];
        this.buildings = database["UBC Buildings"];
        this.ubc_boundary = database["UBC Boundary"];
        this.polyKeys = Object.keys(this.all_polygon_sets);

        // vv uncomment for cross-validation testing vv
        /*
        var lidar_polygons = this.all_polygon_sets["LiDAR 2018"];
        lidar_polygons.name = "LiDAR 2018";    
        var ortho_polygons = this.all_polygon_sets["Orthophoto 2018"];
        ortho_polygons.name = "Orthophoto 2018";    
        //ortho_polygons = findIntersections(ortho_polygons, ubc_boundary);    
        lidar_polygons = findIntersections(lidar_polygons, this.ubc_boundary);
        this.polygons = ortho_polygons;    
        var lidar_ortho = findIntersections(lidar_polygons, ortho_polygons);
        this.polygons = lidar_ortho;
        */
        // remove after TIC-96
        //this.polygons = ortho_polygons;
        //this.polygons = lidar_polygons;  
    }

    getPolygonSetIndex(key) {
        return this.polyKeys.indexOf(key)
    }

}