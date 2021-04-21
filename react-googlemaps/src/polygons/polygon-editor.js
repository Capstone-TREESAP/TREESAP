import * as turf from '@turf/turf';
import { v4 as uuidv4 } from 'uuid';

export class PolygonEditor {

  static getPointsFromPolygon(polygon) {
    return polygon.overlay.getPath().getArray();
  }

  static getPointsFromRectangle(props, rectangle) {
    const {google} = props;

    let bounds = JSON.parse(JSON.stringify(rectangle.overlay.getBounds()));
    let points = [
      new google.maps.LatLng(bounds["south"], bounds["east"]),
      new google.maps.LatLng(bounds["south"], bounds["west"]),
      new google.maps.LatLng(bounds["north"], bounds["west"]),
      new google.maps.LatLng(bounds["north"], bounds["east"])
    ];
    return points;
  }

  static calculatePolygonArea(points) {
    let coordinates = PolygonEditor.JSONToGeoJSONCoords(points);
    let polygon = turf.polygon(coordinates)
    return turf.area(polygon)
  }

  static getTotalArea(polygonList) {
    let area = 0;
    for (var i = 0; i < polygonList.length; i++) {
      area += polygonList[i]["area"];
    }
    return area.toFixed(2);
  }

  static createKey(prefix) {
    return prefix + "-" + uuidv4();
  }

  static pointToLatLng(props, point) {
    const {google} = props;
    return new google.maps.LatLng(point);
  }

  static createEditablePolygon(props, polygon, map, color, zIndex) {
    const {google} = props;

    const polygonEdit = new google.maps.Polygon({
      draggable: true,
      editable: true,
      fillColor: color,
      fillOpacity: 0.65,
      paths: polygon.points,
      strokeColor: color,
      strokeOpacity: 0.8,
      strokeWeight: 2,
      map: map,
      zIndex: zIndex,
    });
    return polygonEdit;
  }

  static getPolygonEdits(editablePolygon) {
    let path = editablePolygon.getPath();
    let points = [];

    for (var i = 0; i < path.length; i++) {
      points.push(path.getAt(i));
    }
    return points;
  }

  static removeEditablePolygon(editablePolygon) {
    editablePolygon.setMap(null);
  }

  static backwardsGeoJSONToJSONCoords(geoCoords) {
    let jsonCoords = [];
    for (var i = 0; i < geoCoords.length; i++) {
      jsonCoords.push(
        {
          lat: geoCoords[i][1],
          lng: geoCoords[i][0]
        }
      );
    }
    return jsonCoords;
  }

  static inputToJSONCoords(geoCoords) {
    let jsonCoords = [];
    for (let i = 0; i < geoCoords.length; i++) {
      let jsonSubCoords = PolygonEditor.backwardsGeoJSONToJSONCoords(geoCoords[i]);
      jsonCoords.push(jsonSubCoords);
    }
    return jsonCoords;
  }

  static geoJSONToJSONLine(geoLine) {
    let jsonLine = [];

    for (let i = 0; i < geoLine.length; i++) {
      jsonLine.push(
        {
          lat: geoLine[i][0],
          lng: geoLine[i][1]
        }
      );
    }

    return jsonLine;
  }

  static geoJSONToJSONCoords(geoCoords) {
    let jsonCoords = [];
    for (let i = 0; i < geoCoords.length; i++) {
      jsonCoords.push(PolygonEditor.geoJSONToJSONLine(geoCoords[i]))
    }
    return jsonCoords;
  }

  //TODO can we use only one coordinate system? Or at least clean up the code
  // for switching between them
  static JSONToGeoJSONCoords(jsonCoords) {
    let geoCoords = [];
    for (let i = 0; i < jsonCoords.length; i++) {
      let subGeoCoords = [];
      let subJsonCoords = jsonCoords[i];
      for (let j = 0; j < subJsonCoords.length; j++) {
        subGeoCoords.push([
          subJsonCoords[j]["lat"],
          subJsonCoords[j]["lng"]
        ]);
      }

      //Make last point first point if it isn't already
      if (subGeoCoords[subGeoCoords.length] != subGeoCoords[0]) {
        subGeoCoords.push(subGeoCoords[0]);
      }

      geoCoords.push(subGeoCoords)
    }

    return geoCoords;
  }

  static googleToGeoJSONCoords(googleCoords) {
    let geoCoords = [];
    for (var i = 0; i < googleCoords.length; i++) {
      geoCoords.push([
        googleCoords[i].lat(),
        googleCoords[i].lng()
      ]);
    }

    //Make last point first point if it isn't already
    if (geoCoords[geoCoords.length] != geoCoords[0]) {
      geoCoords.push(geoCoords[0]);
    }
    return [geoCoords];
  }

  static googleToJSONCoords(googleCoords) {
    let jsonCoords = [];
    for (var i = 0; i < googleCoords.length; i++) {
      jsonCoords.push({
        "lat": googleCoords[i].lat(),
        "lng": googleCoords[i].lng()
      });
    }
    return jsonCoords;
  }

  static jsonToGoogleCoords(props, jsonCoords) {
    const {google} = props;
    let googleCoords = [];
    for (var i = 0; i < jsonCoords.length; i++) {
      googleCoords.push(
        new google.maps.LatLng(jsonCoords[i]["lat"], jsonCoords[i]["lng"])
      );
    }
    return googleCoords;
  }

  static geoJSONToGoogleCoords(props, geoCoords) {
    const {google} = props;
    let googleCoords = [];
    for (var i = 0; i < geoCoords.length; i++) {
      googleCoords.push(
        new google.maps.LatLng(geoCoords[i][0], geoCoords[i][1])
      );
    }
    return googleCoords;
  }

  static getPolygonGeoJSON(points) {
    let jsonPoints = [];
    for (var i in points) {
      jsonPoints.push(
        [points[i].lat(), points[i].lng()]
      );
    }
    let geojson = {
      "type": "Polygon",
      "coordinates": [jsonPoints]
    };
    return JSON.stringify(geojson);
  }
}
