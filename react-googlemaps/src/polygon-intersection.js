import * as turf from '@turf/turf'
import { PolygonEditor } from './polygon-editor'

var currID = 500000

export class PolygonIntersection {
    constructor(props, polygon) {
        this.props = props
        const {google} = props

        var bounds;
        if (polygon.type == google.maps.drawing.OverlayType.POLYGON) {
            bounds = PolygonEditor.getPointsFromPolygon(polygon);
        } else if (polygon.type == google.maps.drawing.OverlayType.RECTANGLE) {
            bounds = PolygonEditor.getPointsFromRectangle(props, polygon);
        }
        polygon.overlay.setMap(null)

        let boundingPoints = PolygonEditor.googleToGeoJSONCoords(bounds)
        this.boundingPolygon = turf.polygon(boundingPoints)
    }

    getBoundingLine() {
        let boundingLine = turf.polygonToLine(this.boundingPolygon)
        let coordinates = boundingLine.geometry.coordinates;
        return {
            "coordinates": PolygonEditor.geoJSONtoJSONCoords(coordinates),
        }
    }
    
    //TODO this crashes when polygons are edited, figure out what's going wrong
    findIntersectingPolygons(polygonList) {
        let intersectingPolygons = []

        for (var i = 0; i < polygonList.length; i++) {
            let polygon = turf.polygon(PolygonEditor.JSONtoGeoJSONCoords(polygonList[i].points))
            let intersection = turf.intersect(polygon, this.boundingPolygon)

            if (intersection != null) {
                intersectingPolygons.push(this.geoJSONToJSONPolygon(intersection))
            }
        }

        return intersectingPolygons
    }

    geoJSONToJSONPolygon(turfPolygon) {
        let coordinates = turfPolygon.geometry.coordinates[0]
        let googleCoords = PolygonEditor.geoJSONToGoogleCoords(this.props, coordinates)

        let area = PolygonEditor.getPolygonArea(this.props, googleCoords)
        currID += 1
        return {
            "type": "Polygon",
            "points": PolygonEditor.geoJSONtoJSONCoords(coordinates),
            "id": currID, //TODO
            "area": area
        }
    }
 }