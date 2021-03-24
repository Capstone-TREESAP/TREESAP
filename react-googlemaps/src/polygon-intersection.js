import * as turf from '@turf/turf'
import { PolygonEditor } from './polygon-editor'

var currID = 500000

export class PolygonIntersection {
    constructor(props, polygon, map) {
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
        this.editableBounds = null
        this.map = map
    }

    getBoundingLine() {
        let boundingLine = turf.polygonToLine(this.boundingPolygon)
        let coordinates = boundingLine.geometry.coordinates;
        return {
            "coordinates": PolygonEditor.geoJSONtoJSONCoords(coordinates),
        }
    }
    
    findIntersectingPolygons(polygonList) {
        let intersectingPolygons = []

        for (var i = 0; i < polygonList.length; i++) {
            let polygon = turf.polygon(PolygonEditor.JSONtoGeoJSONCoords(polygonList[i].points))
            let intersection = turf.intersect(polygon, this.boundingPolygon)

            if (intersection != null) {
                if (intersection.geometry.type == "Polygon") {
                    intersectingPolygons.push(
                        this.turfToJSONPolygon(intersection.geometry.coordinates[0])
                    )
                } else {
                    for (var polyNum in intersection.geometry.coordinates) {
                        intersectingPolygons.push(
                            this.turfToJSONPolygon(intersection.geometry.coordinates[polyNum][0])
                        )
                    }
                }
            }
        }

        return intersectingPolygons
    }

    turfToJSONPolygon(turfPolygon) {
        let coordinates = turfPolygon
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

    makeEditable = () => {
        let polygon = {
            "points": PolygonEditor.geoJSONtoJSONCoords(this.boundingPolygon.geometry.coordinates[0])
        }
        this.editableBounds = PolygonEditor.createEditablePolygon(this.props, polygon, this.map, "#CC2828", 1);
    }

    makeUneditable = () => {
        if (this.editableBounds == null) {
            return
        }

        let newPoints = PolygonEditor.getPolygonEdits(this.editableBounds)
        PolygonEditor.removeEditablePolygon(this.editableBounds)
        let geojsonPoints = PolygonEditor.googleToGeoJSONCoords(newPoints)

        this.boundingPolygon = turf.polygon(geojsonPoints)
        this.editableBounds = null
    }

 }