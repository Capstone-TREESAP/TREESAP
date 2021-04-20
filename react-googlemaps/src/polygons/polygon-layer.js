import { PolygonEditor } from './polygon-editor';

const CUSTOM_KEY = "C";
var customKeyNum = 0;

export class PolygonLayer {
  constructor(polygonList, props, type) {
    this.props = props;
    this.polygon = null;
    this.editablePolygon = null;
    this.type = type;
    this.polygons = this.parsePolygons(polygonList, type);
  }

  selectPolygon(polygon) {
    this.polygon = polygon;
  }


  /*
  Trees: continue to split multipolygons into polygons and don't allow inner rings,
  because trying to test that everything works properly otherwise might be a nightmare.
  (Once the code is rewritten we can see if that's actually true)

  Buildings: allow inner rings and multipolygons? Or just inner rings? Start with just inner
  rings
  */

  parsePolygons(polygons, type) {
    let collectedPolygons = [];
    for (var i = 0; i < polygons.features.length; i++) {
      let polygon = polygons.features[i]

      //Multipolygons get split into separate polygons. This shouldn't 
      // affect anything major - just means you have to delete them separately.
      let coordinateList = [];
      if (polygon.geometry.type == "MultiPolygon") {
        coordinateList = polygon.geometry.coordinates
      } else if (polygon.geometry.type == "Polygon") {
        coordinateList = [polygon.geometry.coordinates]
      }

      for (let j = 0; j < coordinateList.length; j++) {
        let coordinates = coordinateList[j]

        let points = PolygonEditor.backwardsGeoJSONToJSONCoords(coordinates)
        let area = PolygonEditor.getPolygonArea(this.props, points.map(
          point => PolygonEditor.pointToLatLng(this.props, point)
        ))

        let key = null;
        if (type == "tree") {
          if (polygon.properties.id) {
            key = polygon.properties.id;

          } else {
            key = customKeyNum++;
          }
        } else {
          key = polygon.properties["BLDG_UID"];
        }

        if (polygon.geometry.type == "MultiPolygon") {
          key += "." + j;
        }

        let parsedPolygon = {
          "key": key,
          "points": points,
          "area": area,
          "editable": false,
          "type": type
        };
        if (type == "building") {
          parsedPolygon.address = polygon.properties["PRIMARY_ADDRESS"];
          parsedPolygon.name = polygon.properties["NAME"];
          parsedPolygon.neighbourhood = polygon.properties["NEIGHBOURHOOD"];
          parsedPolygon.occupied_date = polygon.properties["OCCU_DATE"];
          parsedPolygon.max_floors = polygon.properties["MAX_FLOORS"];
        }

        collectedPolygons.push(parsedPolygon);
      }
    }
  }

  makePolygonEditable = (polygon, map) => {
    let index = this.polygons.findIndex(element => element === polygon);
    this.polygons.splice(index, 1);
    this.editablePolygon = PolygonEditor.createEditablePolygon(this.props, polygon, map, "#014421", 0);
  }

  makeCurrentPolygonUneditable = () => {
    if (this.editablePolygon == null) {
      return;
    }

    let newPoints = PolygonEditor.getPolygonEdits(this.editablePolygon);
    let newArea = PolygonEditor.getPolygonArea(this.props, newPoints);
    PolygonEditor.removeEditablePolygon(this.editablePolygon);

    this.polygon.points = PolygonEditor.googleToJSONCoords(newPoints);
    this.polygon.area = newArea;
    this.polygons.push(this.polygon);
    this.editablePolygon = null;
  }

  deletePolygon = (polygon) => {
    let index = this.polygons.findIndex(element => element === polygon);
    this.polygons.splice(index, 1);
    this.polygon = null;
  }

  addPolygon = (polygon) => {
    const {google} = this.props;
    var points;

    if (polygon.type == google.maps.drawing.OverlayType.POLYGON) {
      points = PolygonEditor.getPointsFromPolygon(polygon);
    } else if (polygon.type == google.maps.drawing.OverlayType.RECTANGLE) {
      points = PolygonEditor.getPointsFromRectangle(this.props, polygon);
    }

    let area = PolygonEditor.getPolygonArea(this.props, points);

    this.polygons.push(
      {
        "key": PolygonEditor.createKey(CUSTOM_KEY, customKeyNum++),
        "points": PolygonEditor.googleToJSONCoords(points),
        "area": area,
        "editable": false,
      }
    );
    polygon.overlay.setMap(null);
  }

  containsPolygon(polygon) {
    for (var i = 0; i < this.polygons.length; i++) {
      if (polygon === this.polygons[i]) {
        return true;
      }
    }
    return false;
  }
}
