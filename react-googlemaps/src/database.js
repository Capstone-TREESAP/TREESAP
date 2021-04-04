import { findIntersections } from './validation.js'

const AREAS_OF_INTEREST = "Areas of Interest"
const BUILDINGS = "UBC Buildings"
const CALC_CONSTANTS = "Calculation Constants"
const ALL_POLYGONS = "Tree Cover Polygon Datasets"
const UBC_BOUNDARY = "UBC Boundary"
const CARBON_RATE = "Carbon Sequestration Rate"
const TREE_RUNOFF_RATE = "Tree Run-off Effects Rate"

const URL_PREFIX = "https://raw.githubusercontent.com/Capstone-TREESAP/TREESAP-Database/database_redesign/"

export class Database {
    constructor() {
        this.carbon_rate = 0;
        this.tree_runoff_rate = 0;
        this.neighborhood_polygons = {};
        this.all_polygon_sets = {};
        this.buildings = {};
        this.ubc_boundary = {};
        this.polyKeys = {};
        this.polygons = {};
    }

    parseDatabase = async (database) => {
        await this.parseConstants(database)

        //TODO rename
        this.neighborhood_polygons = await this.parseFiles(database[AREAS_OF_INTEREST].files)
        await this.parsePolygonSets(database)
        this.buildings = await this.parseFiles(database[BUILDINGS].files)
        this.ubc_boundary = await this.parseFiles(database[UBC_BOUNDARY].files)

        // vv uncomment for cross-validation testing vv
        // this.runValidation()
    }

    parsePolygonSets = async (database) => {
        this.polyKeys = Object.keys(database[ALL_POLYGONS])
        for (let i in this.polyKeys) {
            let setName = this.polyKeys[i]
            let set = await this.parseFiles(database[ALL_POLYGONS][setName].files)
            this.all_polygon_sets[setName] = set
        }
    }

    parseFiles = async (files) => {
        let values = []
        for (let file in files) {
            let fileURL = URL_PREFIX + files[file]

            let fileValues = await this.parseFile(fileURL)
            fileValues.features.forEach(value => values.push(value))
        }

        return {"features": values}
    }

    parseConstants = async (database) => {
        let fileURL = URL_PREFIX + database[CALC_CONSTANTS].files[0] //TODO

        let constants = await this.parseFile(fileURL)
        this.carbon_rate = parseFloat(constants[CARBON_RATE]);
        this.tree_runoff_rate = parseFloat(constants[TREE_RUNOFF_RATE]);
    }

    parseFile = async (fileURL) => {
        let values = await this.parseFileAsync(fileURL)
        return values
    }

    parseFileAsync = async (fileURL) => {
        return fetch(fileURL)
        .then(res => res.json())
    }

    runValidation() {
        var lidar_polygons = this.all_polygon_sets["LiDAR 2018"];
        lidar_polygons.name = "LiDAR 2018";    
        var ortho_polygons = this.all_polygon_sets["Orthophoto 2018"];
        ortho_polygons.name = "Orthophoto 2018";    
        //ortho_polygons = findIntersections(ortho_polygons, ubc_boundary);    
        // lidar_polygons = findIntersections(lidar_polygons, this.ubc_boundary);
        this.polygons = ortho_polygons;    
        var lidar_ortho = findIntersections(lidar_polygons, ortho_polygons);
        this.polygons = lidar_ortho;

        // remove after TIC-96
        //this.polygons = ortho_polygons;
        //this.polygons = lidar_polygons;  
    }

    getPolygonSetIndex(key) {
        return this.polyKeys.indexOf(key)
    }

}