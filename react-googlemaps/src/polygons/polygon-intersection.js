import * as turf from '@turf/turf';
import { PolygonEditor } from './polygon-editor';

const INTERSECTION_KEY = "I";
const TEMP_KEY = "T";

/**
 * Stores information about intersections, aka areas of interest
 */
export class PolygonIntersection {
  constructor(props, polygon, map, predefined, name) {
    this.props = props;
    const {google} = props;
    this.name = name;
    this.predefined = predefined;

    let boundingPoints;
    if (predefined) {
      boundingPoints = PolygonEditor.JSONToGeoJSONCoords([polygon]);
    } else {
      let bounds;
      if (polygon.type == google.maps.drawing.OverlayType.POLYGON) {
        bounds = PolygonEditor.getPointsFromPolygon(polygon);
      } else if (polygon.type == google.maps.drawing.OverlayType.RECTANGLE) {
        bounds = PolygonEditor.getPointsFromRectangle(props, polygon);
      }
      polygon.overlay.setMap(null);
      boundingPoints = PolygonEditor.googleToGeoJSONLine(bounds);
    }

    this.boundingPolygon = turf.polygon(boundingPoints);
    this.editableBounds = null;
    this.map = map;
  }

  /**
   * Get the bounding line of the intersection in JSON format
   * @returns A line with a name, key, and coordinates
   */
  getBoundingLine() {
    let boundingLine = turf.polygonToLine(this.boundingPolygon);
    let coordinates = boundingLine.geometry.coordinates;
    return {
      "name": this.name,
      "key": PolygonEditor.createKey(INTERSECTION_KEY),
      "coordinates": PolygonEditor.geoJSONToJSONLine(coordinates),
    };
  }

  /**
   * Given a list of polygons, find all of the polygons that intersect with
   * this bounding polygon.
   * @param {*} polygonList A list of polygons in JSON format
   * @returns A list of intersecting polygons. This contains:
   * 1. Any polygons in the list that are fully bounded by the bounding polygon, aka are fully
   * contained within it
   * 2. The parts of any polygons that partially intersect with the bounding polygon, aka
   * the pieces of those polygons that are within bounds
   */
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

  /**
   * Convert a polygon output by the turf intersection function
   * into a JSON polygon
   * @param {*} turfCoordinates The points in the polygon created by turf
   * @returns A JSON polygon containing the points, along with its area and
   * a unique key
   */
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

  /**
   * Make the intersection bounds editable
   */
  makeEditable = () => {
    let polygon = {
      "points": PolygonEditor.geoJSONToJSONCoords(this.boundingPolygon.geometry.coordinates)
    };
    this.editableBounds = PolygonEditor.createEditablePolygon(this.props, polygon, this.map, "#CC2828", 1);
  }

  /**
   * Make the intersection bounds uneditable and save any edits that were made.
   */
  makeUneditable = () => {
    if (this.editableBounds == null) {
      return;
    }

    let newPoints = PolygonEditor.getPolygonEdits(this.editableBounds);
    PolygonEditor.removeEditablePolygon(this.editableBounds);
    let geojsonPoints = PolygonEditor.googleToGeoJSONLine(newPoints);

    this.boundingPolygon = turf.polygon(geojsonPoints);
    this.editableBounds = null;
  }
}
