import * as turf from '@turf/turf';
import { v4 as uuidv4 } from 'uuid';

/**
 * A class of static functions related to polygons
 */
export class PolygonEditor {

  /**
   * Given a google maps polygon, get the list of points contained within it.
   * @param {*} polygon A google maps polygon
   * @returns A set of points in the google format describing a polygon
   */
  static getPointsFromPolygon(polygon) {
    return polygon.overlay.getPath().getArray();
  }

  /**
   * Given a google maps rectangle, get the list of points describing the corners.
   * @param {*} props A set of properties containing a reference to google
   * @param {*} rectangle A google maps rectangle
   * @returns A set of points in the google format describing a polygon
   */
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

  /**
   * Calculate the area of a polygon, given the points of that polygon
   * @param {*} points A set of points in JSON format
   * @returns The area of the polygon
   */
  static calculatePolygonArea(points) {
    let coordinates = PolygonEditor.JSONToGeoJSONCoords(points);
    let polygon = turf.polygon(coordinates)
    return turf.area(polygon)
  }

  /**
   * Calculate the total area of a set of polygons
   * @param {*} polygonList A set of polygons in JSON format, each containing an "area" field
   * with the area of that polygon
   * @returns The total area, rounded to two decimal points
   */
  static getTotalArea(polygonList) {
    let area = 0;
    for (var i = 0; i < polygonList.length; i++) {
      area += polygonList[i]["area"];
    }
    return area.toFixed(2);
  }

  /**
   * Create a unique key that can be assigned to a polygon
   * @param {*} prefix a prefix to be added to the key
   * @returns A unique key starting with the specified prefix
   */
  static createKey(prefix) {
    return prefix + "-" + uuidv4();
  }

  /**
   * Find the centroid coordinates of a polygon
   * @param {*} polygon A polygon in JSON format
   * @returns The centroid coordinates
   */
  static findPolygonCentroid(polygon) {
    if (polygon) {
      return turf.centroid(turf.polygon(PolygonEditor.JSONToGeoJSONCoords(polygon.points)));
    }
  }

  /**
   * Create a polygon which can be edited and dragged.
   * @param {*} props A set of properties containing a reference to google
   * @param {*} polygon A JSON polygon containing the points of the polygon to be created
   * @param {*} map A reference to the map the polygon should be drawn on
   * @param {*} color The color of the polygon
   * @param {*} zIndex The zIndex (height) of the polygon
   * @returns A new, editable polygon in google format
   */
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

  /**
   * Get the updated path of a polygon
   * @param {*} editablePolygon The polygon to get the path from
   * @returns A set of points describing the polygon
   */
  static getPolygonEdits(editablePolygon) {
    let path = editablePolygon.getPath();
    let points = [];

    for (var i = 0; i < path.length; i++) {
      points.push(path.getAt(i));
    }
    return points;
  }

  /**
   * Remove a google maps polygon from the map
   * @param {*} editablePolygon A google maps polygon
   */
  static removeEditablePolygon(editablePolygon) {
    editablePolygon.setMap(null);
  }

  /*** Functions to convert between different types of polygons ***/

  /**
   * Convert a set of points from GeoJSON to JSON
   * GeoJSON format: [<lng value>, <lat value>]
   * JSON format: {lng: <lng value>, lat: <lat value>}
   * @param {*} geoLine a list containing points in GeoJSON format
   * @returns a list containing points in JSON format
   */
  static geoJSONToJSONLine(geoLine) {
    let jsonLine = [];

    for (let i = 0; i < geoLine.length; i++) {
      jsonLine.push(
        {
          lng: geoLine[i][0],
          lat: geoLine[i][1]
        }
      );
    }

    return jsonLine;
  }

  /**
   * Convert a set of points representing polygon coordinates
   * from GeoJSON to JSON.
   * @param {*} geoCoords A list of lists of points in GeoJSON format
   * @returns A list of lists of points in JSON format
   */
  static geoJSONToJSONCoords(geoCoords) {
    let jsonCoords = [];
    for (let i = 0; i < geoCoords.length; i++) {
      jsonCoords.push(PolygonEditor.geoJSONToJSONLine(geoCoords[i]))
    }
    return jsonCoords;
  }

  /**
   * Convert a set of points from JSON to GeoJSON format.
   * GeoJSON format: [<lng value>, <lat value>]
   * JSON format: {lng: <lng value>, lat: <lat value>}
   * @param {*} jsonLine a list containing points in JSON format
   * @returns A list containing points in GeoJSON format
   */
  static JSONToGeoJSONLine(jsonLine) {
    let geoLine = [];

    for (let i = 0; i < jsonLine.length; i++) {
      geoLine.push([
        jsonLine[i]["lng"],
        jsonLine[i]["lat"] 
      ]);
    }

    //Make last point first point if it isn't already
    if (geoLine[geoLine.length] != geoLine[0]) {
      geoLine.push(geoLine[0]);
    }

    return geoLine;
  }

  /**
   * Convert a set of points representing polygon coordinates
   * from JSON to GeoJSON
   * @param {*} jsonCoords A list of lists of points in JSON format
   * @returns A list of lists of points in GeoJSON format
   */
  static JSONToGeoJSONCoords(jsonCoords) {
    let geoCoords = [];
    for (let i = 0; i < jsonCoords.length; i++) {
      geoCoords.push(PolygonEditor.JSONToGeoJSONLine(jsonCoords[i]))
    }

    return geoCoords;
  }

  /**
   * Convert a list of points from google to GeoJSON format
   * Google format: A LatLng object
   * GeoJSON format: [<lng value>, <lat value>]
   * @param {*} googleCoords A list of points in Google LatLng format
   * @returns A list of points in GeoJSON format
   */
  static googleToGeoJSONLine(googleCoords) {
    let geoCoords = [];
    for (var i = 0; i < googleCoords.length; i++) {
      geoCoords.push([
        googleCoords[i].lng(),
        googleCoords[i].lat()
      ]);
    }

    //Make last point first point if it isn't already
    if (geoCoords[geoCoords.length] != geoCoords[0]) {
      geoCoords.push(geoCoords[0]);
    }
    return [geoCoords];
  }

  /**
   * Convert a list of points from google to JSON format
   * Google format: A LatLng object
   * JSON format: {lng: <lng value>, lat: <lat value>}
   * @param {*} googleCoords A list of points in Google LatLng format
   * @returns A list of points in JSON format
   */
  static googleToJSONLine(googleCoords) {
    let jsonCoords = [];
    for (var i = 0; i < googleCoords.length; i++) {
      jsonCoords.push({
        "lat": googleCoords[i].lat(),
        "lng": googleCoords[i].lng()
      });
    }
    return jsonCoords;
  }
}
