import * as turf from '@turf/turf';
import { PolygonEditor } from './polygon-editor';

const INTERSECTION_KEY = "I";
const TEMP_KEY = "T";

export class PolygonIntersection {
  constructor(props, polygon, map, name) {
    this.props = props;
    const {google} = props;
    this.name = name;

    //TODO this is hacky but works for now
    let boundingPoints;
    if (name == undefined) {
      var bounds;
      if (polygon.type == google.maps.drawing.OverlayType.POLYGON) {
        bounds = PolygonEditor.getPointsFromPolygon(polygon);
      } else if (polygon.type == google.maps.drawing.OverlayType.RECTANGLE) {
        bounds = PolygonEditor.getPointsFromRectangle(props, polygon);
      }
      polygon.overlay.setMap(null);
      boundingPoints = PolygonEditor.googleToGeoJSONCoords(bounds);
    } else {
      boundingPoints = PolygonEditor.JSONToGeoJSONCoords([polygon]);
    }

    this.boundingPolygon = turf.polygon(boundingPoints);
    this.editableBounds = null;
    this.map = map;
  }

  getBoundingLine() {
    let boundingLine = turf.polygonToLine(this.boundingPolygon);
    let coordinates = boundingLine.geometry.coordinates;
    return {
      "name": this.name,
      "key": PolygonEditor.createKey(INTERSECTION_KEY),
      "coordinates": PolygonEditor.geoJSONToJSONLine(coordinates),
    };
  }

  findIntersectingPolygons(polygonList) {
    let intersectingPolygons = [];

    for (var i = 0; i < polygonList.length; i++) {
      let polygon = turf.polygon(PolygonEditor.JSONToGeoJSONCoords(polygonList[i].points));
      let intersection = turf.intersect(polygon, this.boundingPolygon);

      if (intersection != null) {
        if (intersection.geometry.type == "Polygon") {
          intersectingPolygons.push(
            this.turfToJSONPolygon(intersection.geometry.coordinates)
          );
        } else {
          for (var polyNum in intersection.geometry.coordinates) {
            intersectingPolygons.push(
              this.turfToJSONPolygon(intersection.geometry.coordinates[polyNum])
            );
          }
        }
      }
    }
    return intersectingPolygons;
  }

  turfToJSONPolygon(turfCoordinates) {
    let turfPolygon = turf.polygon(turfCoordinates)
    let area = turf.area(turfPolygon);
    return {
      "type": "Polygon",
      "points": PolygonEditor.geoJSONToJSONCoords(turfCoordinates),
      "key": PolygonEditor.createKey(TEMP_KEY),
      "area": area,
    };
  }

  makeEditable = () => {
    let polygon = {
      "points": PolygonEditor.geoJSONToJSONCoords(this.boundingPolygon.geometry.coordinates)
    };
    this.editableBounds = PolygonEditor.createEditablePolygon(this.props, polygon, this.map, "#CC2828", 1);
  }

  makeUneditable = () => {
    if (this.editableBounds == null) {
      return;
    }

    let newPoints = PolygonEditor.getPolygonEdits(this.editableBounds);
    PolygonEditor.removeEditablePolygon(this.editableBounds);
    let geojsonPoints = PolygonEditor.googleToGeoJSONCoords(newPoints);

    this.boundingPolygon = turf.polygon(geojsonPoints);
    this.editableBounds = null;
  }
}
