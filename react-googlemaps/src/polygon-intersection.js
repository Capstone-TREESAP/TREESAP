import * as turf from '@turf/turf'

const intersectionColor = '#CC2828'

export class PolygonIntersection {
    constructor(boundingPolygon) {
        this.boundingPolygon = this.jsonPolygonToTurfPolygon(boundingPolygon)
    }

    jsonPolygonToTurfPolygon(polygon) {
        let jsonPolygon = JSON.parse(polygon)
        let coordinates = jsonPolygon["coordinates"][0]
        coordinates.push(coordinates[0])

        return turf.polygon([coordinates])
    }

    polygonToTurfPolygon(polygon) {
        let coordinates = []
        for (var point in polygon.points) {
            coordinates.push([
                polygon.points[point]["lat"], 
                polygon.points[point]["lng"]
            ])
        }

        let jsonPolygon = {
            "type:": "Polygon",
            "coordinates": [coordinates]
        }
        
        return this.jsonPolygonToTurfPolygon(JSON.stringify(jsonPolygon))
    }    

    findIntersectingPolygons(polygonList) {
        let intersectingPolygons = []

        for (var i = 0; i < polygonList.length; i++) {
            let polygon = this.polygonToTurfPolygon(polygonList[i])
            let intersection = turf.intersect(polygon, this.boundingPolygon)

            if (intersection != null) {
                intersectingPolygons.push(polygonList[i])
            }
        }

        return intersectingPolygons
    }

    displayIntersections(polygonList) {
        let intersections = this.findIntersectingPolygons(polygonList)

    }
}