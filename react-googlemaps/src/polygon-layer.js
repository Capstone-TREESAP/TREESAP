import { PolygonEditor } from './polygon-editor'

export class PolygonLayer {
    constructor(polygonList, props, map) {
        this.polygons = this.parsePolygons(polygonList);
        this.props = props
        this.map = map
        this.polygon = null
        this.editablePolygon = null
    }

    selectPolygon(polygon) {
        this.polygon = polygon
    }

    parsePolygons(polygons){
        let collectedPolygons = [];
    
        for(var i = 0; i < polygons.features.length; i++) {
      
            var polygon = polygons.features[i].geometry.coordinates[0];
            var area = polygons.features[i].properties.area;
            var points = [];
            for(var point in polygon) {
                points.push(
                {
                    lat: parseFloat(polygon[point][1]),
                    lng: parseFloat(polygon[point][0])
                }
                )
            }
            collectedPolygons.push(
                {
                "id": i,
                "points": points,
                "area": area,
                "editable": false
                }
            )
        }
    
        return collectedPolygons;
    };

    makePolygonEditable = (polygon) => {
        let index = this.polygons.findIndex(element => element === polygon)
        this.polygons.splice(index, 1);
        this.editablePolygon = PolygonEditor.createEditablePolygon(this.props, polygon, this.map);
    }

    makeCurrentPolygonUneditable = () => {
        if (this.editablePolygon == null) {
            return
        }

        let newPoints = PolygonEditor.getPolygonEdits(this.editablePolygon)
        PolygonEditor.removeEditablePolygon(this.editablePolygon)

        this.polygon.points = newPoints
        this.polygons.push(this.polygon)
        this.editablePolygon = null
    }
    
    deletePolygon = (polygon) => {
        let index = this.polygons.findIndex(element => element === polygon)
        this.polygons.splice(index, 1)
        this.polygon = null
    }
}