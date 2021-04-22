import { PolygonLayer } from './polygons/polygon-layer.js'
import { findIntersections } from './validation.js'

//The labels in the database for different sections
const AREAS_OF_INTEREST = "Areas of Interest"
const BUILDINGS = "UBC Buildings"
const CALC_CONSTANTS = "Calculation Constants"
const ALL_POLYGONS = "Tree Cover Polygon Datasets"
const UBC_BOUNDARY = "UBC Boundary"
const CARBON_RATE = "Carbon Sequestration Rate"
const TREE_RUNOFF_RATE = "Tree Run-off Effects Rate"

//The URL from which to fetch data
const URL_PREFIX = "https://raw.githubusercontent.com/Capstone-TREESAP/TREESAP-Database/database_redesign/"

/**
 * Stores data loaded from the external database
 */
export class Database {
    constructor() {
        this.carbonRate = 0;
        this.runoffRate = 0;
        this.areas_int_polygons = {};
        this.polygonLayers = [];
        this.buildings = {};
        this.ubc_boundary = {};
        this.polyKeys = {};
        this.polygons = {};
    }

    /**
     * Parse a JSON database into the relevant sections
     * @param {*} database The database to parse
     * @param {*} props Properties to pass to each polygon layer
     */
    parseDatabase = async (database, props) => {
        await this.parseConstants(database)
        this.areas_int_polygons = await this.parseFiles(database[AREAS_OF_INTEREST].files)
        let all_polygon_sets = await this.parsePolygonSets(database)
        try {
            for (let set in all_polygon_sets) {
                this.polygonLayers.push(new PolygonLayer(
                    all_polygon_sets[set],
                    props,
                    "tree"
                ))
            }
        } catch(e) {
            console.log("Error while parsing tree cover polygons in PolygonLayer");
            console.log(e);
        }

        this.buildings = await this.parseFiles(database[BUILDINGS].files)
        this.ubc_boundary = await this.parseFiles(database[UBC_BOUNDARY].files)

        // vv uncomment for cross-validation testing vv
        // this.runValidation(all_polygon_sets)
    }

    /**
     * Parse the tree cover datasets in the database
     * @param {*} database 
     * @returns a set of all tree cover datasets
     */
    parsePolygonSets = async (database) => {
        this.polyKeys = Object.keys(database[ALL_POLYGONS])
        let all_polygon_sets = {};
        for (let i in this.polyKeys) {
            let setName = this.polyKeys[i]
            let set = await this.parseFiles(database[ALL_POLYGONS][setName].files)
            all_polygon_sets[setName] = set
        }

        return all_polygon_sets
    }

    /**
     * Parse and aggregate values from a set of files in the database
     * @param {*} files The files to parse, added to the URL prefix to create the entire 
     * path to each file
     * @returns The features contained within these files in the database
     */
    parseFiles = async (files) => {
        let values = []
        for (let file in files) {
            let fileURL = URL_PREFIX + files[file]

            let fileValues = await this.parseFile(fileURL)
            fileValues.features.forEach(value => values.push(value))
        }

        return {"features": values}
    }

    /**
     * Parse the JSON files containing ecosystem services parameters. The database is assumed to hold
     * only a single file for all parameters, so only the first file is parsed.
     * @param {*} database 
     */
    parseConstants = async (database) => {
        let fileURL = URL_PREFIX + database[CALC_CONSTANTS].files[0]

        let constants = await this.parseFile(fileURL)
        this.carbonRate = parseFloat(constants[CARBON_RATE]);
        this.runoffRate = parseFloat(constants[TREE_RUNOFF_RATE]);
    }

    /**
     * Fetch a single file
     * @param {*} fileURL the file to fetch, added to the URL prefix to get the entire file path
     * @returns the values contained in that file as JSON
     */
    parseFile = async (fileURL) => {
        let values = await this.parseFileAsync(fileURL)
        return values
    }

    /**
     * Helper to fetch a single file
     */
    parseFileAsync = async (fileURL) => {
        return fetch(fileURL)
        .then(res => res.json())
    }

    /**
     * Run the cross validation code. Part of the testing implementation
     * @param {*} all_polygon_sets 
     */
    runValidation(all_polygon_sets) {
        var lidar_polygons = all_polygon_sets["LiDAR 2018"];
        lidar_polygons.name = "LiDAR 2018";
        var ortho_polygons = all_polygon_sets["Orthophoto 2018"];
        ortho_polygons.name = "Orthophoto 2018";
        //ortho_polygons = findIntersections(ortho_polygons, ubc_boundary);
        // lidar_polygons = findIntersections(lidar_polygons, this.ubc_boundary);
        this.polygons = ortho_polygons;
        var lidar_ortho = findIntersections(lidar_polygons, ortho_polygons);
        this.polygons = lidar_ortho;
    }

    /**
     * Given the name of a tree cover dataset, find its index in the database list
     */
    getPolygonSetIndex(key) {
        return this.polyKeys.indexOf(key)
    }

}
