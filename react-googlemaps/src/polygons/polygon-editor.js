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

  static getPolygonArea(props, points) {
    const {google} = props;
    return +google.maps.geometry.spherical.computeArea(points).toFixed(2);
  }

  static getTotalArea(polygonList) {
    let area = 0;
    for (var i = 0; i < polygonList.length; i++) {
      area += polygonList[i]["area"];
    }
    return area.toFixed(2);
  }

  //TODO pad with zeros
  static createKey(prefix, num) {
    return prefix + "-" + num;
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

  static geoJSONtoJSONCoords(geoCoords) {
    let jsonCoords = [];
    for (var i = 0; i < geoCoords.length; i++) {
      jsonCoords.push(
        {
          lat: geoCoords[i][0],
          lng: geoCoords[i][1]
        }
      );
    }
    return jsonCoords;
  }

  static JSONtoGeoJSONCoords(jsonCoords) {
    let geoCoords = [];
    for (var i = 0; i < jsonCoords.length; i++) {
      geoCoords.push([
        jsonCoords[i]["lat"],
        jsonCoords[i]["lng"]
      ]);
    }

    //Make last point first point if it isn't already
    if (geoCoords[geoCoords.length] != geoCoords[0]) {
      geoCoords.push(geoCoords[0]);
    }
    return [geoCoords];
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
