
export class PolygonEditor {

    static createEditablePolygon(props, polygon, map) {   
        const {google} = props

        const polygonEdit = new google.maps.Polygon({
            draggable: true,
            editable: true,
            fillColor: "#014421",
            fillOpacity: 0.65,
            paths: polygon.points,
            strokeColor: "#014421",
            strokeOpacity: 0.8,
            strokeWeight: 2,
            map: map
        })
    
        return polygonEdit;
    }
      
    static getPolygonEdits(editablePolygon) {
        let path = editablePolygon.getPath();
    
        let points = [];
        for (var i = 0; i < path.length; i++) {
            points.push(path.getAt(i))
        }
    
        return points
    }
      
    static removeEditablePolygon(editablePolygon) {
        editablePolygon.setMap(null)
    }
}