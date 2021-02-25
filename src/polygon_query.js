const { once } = require('events');

PYTHON_SCRIPT = 'polygon_query_internal.py'
OUTPUT_FILE = '../out/intersecting_polygons.geojson'

/**
 * Calculates the intersections between a bounding polygon and other polygons.
 * Returns a GeoJSON object containing the intersecting polygons.
 *  (Also contains: bounding polygon as a line, rest of intersecting polygons in grey.
 *    But these will be removed once this isn't being demoed by itself.)
 * @param {string} polygonFile: the file containing all (relevant) polygons to check 
 *  for intersections with
 * @param {JSON} boundingPolygon: the polygon which creates the bounds for intersections
 */
async function polygonQuery(polygonFile, boundingPolygon) {
    //Because the amount of data being passed through is very large, the python script outputs to a file
    // instead of returning the data directly
    const {spawn} = require('child_process');
    const python = spawn('python', [PYTHON_SCRIPT, polygonFile, JSON.stringify(boundingPolygon), OUTPUT_FILE]);
    
    python.stdout.on('data', function (data) {
        console.log(data.toString());
    });

    //Wait for python process to end
    var errorCode;
    python.on('close', function(code) {
        errorCode = code
    });

    await once(python, 'close')
    if (errorCode != 0) {
        console.error("Script was unsuccessful with error code " + errorCode);
        return
    }

    //Read and parse the data
    const fs = require('fs')
    try {
        const jsonString = fs.readFileSync(OUTPUT_FILE)
        const jsonParsed = JSON.parse(jsonString)
        return jsonParsed
    } catch (e) {
        console.log(jsonString)
        console.error(e)
    }
    //Theoretically should delete file, but might need some debugging
    fs.unlinkSync(OUTPUT_FILE)
}

/***********Example of how to use function*************/
//Probably none of this works without manually installing many libraries for node.js and python
//I deeply apologize
//Hopefully eventually dependency management will be a thing

//1. Choose file to import tree polygons from
ALL_POLYGONS_FILE = "../orthophoto/polygons.geojson"
//2. Choose parameters for the bounding polygon (can be any polygon, not just a square)
MIN_BOUND_X = -123.221
MAX_BOUND_X = -123.226
MIN_BOUND_Y = 49.239
MAX_BOUND_Y = 49.242

//3. Create bounding polygon
BOUNDING_POLYGON = {
  "type": "Polygon",
  "coordinates": [
    [
      [
        -123.23105692863464,
        49.247179307237744
      ],
      [
        -123.23162019252777,
        49.24750498065472
      ],
      [
        -123.23236048221587,
        49.24733338955223
      ],
      [
        -123.23236048221587,
        49.2469026582391
      ],
      [
        -123.23149144649506,
        49.246811608862544
      ],
      [
        -123.23105692863464,
        49.247179307237744
      ]
    ]
  ]
}





//4. Call function (is async, so function calling it must also be async)
const printResults = async () => {
    //Get results from function
    const output = await polygonQuery(ALL_POLYGONS_FILE, BOUNDING_POLYGON);

    //Open data in geojson.io
    //Warning: the uri gets way too long very quickly and then everything fails, 
    // so only use this for small amounts of data
    if (output != undefined) {
        outputString = JSON.stringify(output)
        if (outputString.length <= 9000) {
            const uri = encodeURIComponent(JSON.stringify(output));
            const geojsonURL = "http://geojson.io/#data=data:application/json," + uri;
            const open = require('open');
            open(geojsonURL)
        } else {
            console.log("Output was too long to automatically open geojson.io: output is", outputString.length, "characters")
            console.log("Please copy data from", OUTPUT_FILE, "directly")
        }
    }
}

printResults()
