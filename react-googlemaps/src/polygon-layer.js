import { PolygonEditor } from './polygon-editor'

const CUSTOM_KEY = "C"
var customKeyNum = 0

export class PolygonLayer {
    constructor(polygonList, props, map) {
        this.props = props
        this.map = map
        this.polygon = null
        this.editablePolygon = null

        this.polygons = this.parsePolygons(polygonList);
        this.positions = this.parseRawPoints(this.polygons);
    }

    selectPolygon(polygon) {
        this.polygon = polygon
    }

    parsePolygons(polygons){
        let collectedPolygons = [];
    
        for(var i = 0; i < polygons.features.length; i++) {
      
            var coordinates = polygons.features[i].geometry.coordinates[0];
            var points = PolygonEditor.backwardsGeoJSONToJSONCoords(coordinates)
            var area = PolygonEditor.getPolygonArea(this.props, points.map(
                point => PolygonEditor.pointToLatLng(this.props, point)
            ))
            collectedPolygons.push(
                {
                    // "key": polygons.features[i].properties.id, //TODO change this if it gets renamed to key
                    "key": i,
                    "points": points,
                    "area": area,
                    "editable": false
                }
            )
        }
    
        return collectedPolygons;
    };

    parseRawPoints(polygons) {
        let positions = [];
      
        for(var i = 0; i < polygons.length; i++) {
            var polygon = polygons[i].points;
            var rawPoints = [];

            for(var point in polygon) {
                rawPoints.push(
                    [
                        polygon[point]["lng"],
                        polygon[point]["lat"]
                    ]
                );

            }

          positions.push(rawPoints);
        }

        return positions;
    };

    makePolygonEditable = (polygon) => {
        let index = this.polygons.findIndex(element => element === polygon)
        this.polygons.splice(index, 1);
        this.editablePolygon = PolygonEditor.createEditablePolygon(this.props, polygon, this.map, "#014421", 0);
        this.positions = this.parseRawPoints(this.polygons)
    }

    makeCurrentPolygonUneditable = () => {
        if (this.editablePolygon == null) {
            return
        }

        let newPoints = PolygonEditor.getPolygonEdits(this.editablePolygon)
        let newArea = PolygonEditor.getPolygonArea(this.props, newPoints)
        PolygonEditor.removeEditablePolygon(this.editablePolygon)

        this.polygon.points = PolygonEditor.googleToJSONCoords(newPoints)
        this.polygon.area = newArea
        this.polygons.push(this.polygon)
        this.positions = this.parseRawPoints(this.polygons)
        this.editablePolygon = null
    }
    
    deletePolygon = (polygon) => {
        let index = this.polygons.findIndex(element => element === polygon)
        this.polygons.splice(index, 1)
        this.positions = this.parseRawPoints(this.polygons)
        this.polygon = null
    }

    addPolygon = (polygon) => {
        const {google} = this.props
        var points;

        if (polygon.type == google.maps.drawing.OverlayType.POLYGON) {
            points = PolygonEditor.getPointsFromPolygon(polygon)
        } else if (polygon.type == google.maps.drawing.OverlayType.RECTANGLE) {
            points = PolygonEditor.getPointsFromRectangle(this.props, polygon)
        }

        let area = PolygonEditor.getPolygonArea(this.props, points)

        this.polygons.push(
            {
                "key": PolygonEditor.createKey(CUSTOM_KEY, customKeyNum++),
                "points": PolygonEditor.googleToJSONCoords(points),
                "area": area,
                "editable": false
            }
        )
        this.positions = this.parseRawPoints(this.polygons)

        polygon.overlay.setMap(null);
        
    }

    containsPolygon(polygon) {
        for (var i = 0; i < this.polygons.length; i++) {
            if (polygon === this.polygons[i]) {
                return true
            }
        }

        return false
    }
}