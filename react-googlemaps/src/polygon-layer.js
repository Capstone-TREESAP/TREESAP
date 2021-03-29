import { PolygonEditor } from './polygon-editor'

const CUSTOM_KEY = "C"
var customKeyNum = 0

export class PolygonLayer {
    constructor(polygonList, props, map, type) {
        this.props = props
        this.map = map
        this.polygon = null
        this.editablePolygon = null
        this.type = type;
        this.polygons = this.parsePolygons(polygonList, type);
        this.positions = this.parseRawPoints(this.polygons);
    }

    selectPolygon(polygon) {
        this.polygon = polygon
    }

    parsePolygons(polygons, type){
        let collectedPolygons = [];
        for (var i = 0; i < polygons.features.length; i++) {
            for (var j = 0; j < polygons.features[i].geometry.coordinates.length; j++) {
                if (polygons.features[i].geometry.type == "MultiPolygon") {
                    var coordinates = polygons.features[i].geometry.coordinates[j][0];
                } else {
                    var coordinates = polygons.features[i].geometry.coordinates[j];
                }
                var points = PolygonEditor.backwardsGeoJSONToJSONCoords(coordinates)
                var area = PolygonEditor.getPolygonArea(this.props, points.map(
                    point => PolygonEditor.pointToLatLng(this.props, point)
                ))
                var polygon = {
                    // "key": polygons.features[i].properties.id, //TODO change this if it gets renamed to key
                    "key": type == "tree" ? i : polygons.features[i].properties["BLDG_UID"] + "." + j,
                    "points": points,
                    "area": area,
                    "editable": false,
                    "type": type
                };
                if (type == "building") {
                    polygon.address = polygons.features[i].properties["PRIMARY_ADDRESS"];
                    polygon.name = polygons.features[i].properties["NAME"];
                    polygon.neighbourhood = polygons.features[i].properties["NEIGHBOURHOOD"];
                    polygon.occupied_date = polygons.features[i].properties["OCCU_DATE"];
                    polygon.max_floors = polygons.features[i].properties["MAX_FLOORS"];
                }
                collectedPolygons.push(polygon);
            }
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