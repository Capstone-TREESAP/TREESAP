import { PolygonEditor } from './polygon-editor';

const CUSTOM_KEY = "C";

/**
 * Represents a layer of polygons on the basemap
 */
export class PolygonLayer {
  constructor(polygonList, props, type) {
    this.props = props;
    this.polygon = null;
    this.editablePolygon = null;
    this.type = type;
    this.polygons = this.parsePolygons(polygonList, type);
  }

  /**
   * Mark this polygon as selected
   * @param {*} polygon A polygon contained in the polygon layer
   */
  selectPolygon(polygon) {
    this.polygon = polygon;
  }

  /**
   * Parse a feature collection of GeoJSON polygons into JSON polygons
   * @param {*} polygons A GeoJSON feature collection containing only Polygons and MultiPOlygons
   * @param {*} type What these polygons represent. Can be "tree" or "building"
   * @returns A set of JSON polygons, each with its area and a unique key
   */
  parsePolygons(polygons, type) {
    let collectedPolygons = [];
    for (let i = 0; i < polygons.features.length; i++) {
      let polygon = polygons.features[i];

      //Multipolygons get split into separate polygons. This shouldn't 
      // affect anything major - just means you have to delete them separately.
      let coordinateList = [];
      if (polygon.geometry.type == "MultiPolygon") {
        coordinateList = polygon.geometry.coordinates;
      } else if (polygon.geometry.type == "Polygon") {
        coordinateList = [polygon.geometry.coordinates];
      }

      for (let j = 0; j < coordinateList.length; j++) {
        let coordinates = coordinateList[j];

        let points = PolygonEditor.geoJSONToJSONCoords(coordinates);
        let area = PolygonEditor.calculatePolygonArea(points);        

        let key = null;
        if (type == "tree") {
          if (polygon.properties.id) {
            key = polygon.properties.id;

          } else {
            key = PolygonEditor.createKey(CUSTOM_KEY);
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

    return collectedPolygons;
  }

  /**
   * Make a polygon from this layer editable
   * @param {*} polygon The polygon to make editable. Must be a polygon in this layer.
   * @param {*} map A reference to the basemap, on top of which the editable polygon will
   * be displayed.
   */
  makePolygonEditable = (polygon, map) => {
    let index = this.polygons.findIndex(element => element === polygon);
    this.polygons.splice(index, 1);
    this.editablePolygon = PolygonEditor.createEditablePolygon(this.props, polygon, map, "#014421", 0);
  }

  /**
   * Make whatever polygon is currently editable, uneditable. Does nothing if no polygons are
   * currently editable.
   */
  makeCurrentPolygonUneditable = () => {
    if (this.editablePolygon == null) {
      return
    }

    let newPoints = [PolygonEditor.googleToJSONLine(PolygonEditor.getPolygonEdits(this.editablePolygon))];
    let newArea = PolygonEditor.calculatePolygonArea(newPoints);
    PolygonEditor.removeEditablePolygon(this.editablePolygon);

    this.polygon.points = newPoints;
    this.polygon.area = newArea;
    this.polygons.push(this.polygon);
    this.editablePolygon = null;
  }

  /**
   * Delete a polygon from this layer.
   * @param {*} polygon A JSON polygon. Must be a polygon in this layer.
   */
  deletePolygon = (polygon) => {
    let index = this.polygons.findIndex(element => element === polygon);
    this.polygons.splice(index, 1);
    this.polygon = null;
  }

  /**
   * Add a polygon to this layer.
   * @param {*} polygon The new polygon to add. Must be a google maps Polygon or Rectangle.
   */
  addPolygon = (polygon) => {
    const {google} = this.props;
    var points;

    if (polygon.type == google.maps.drawing.OverlayType.POLYGON) {
      points = PolygonEditor.getPointsFromPolygon(polygon);
    } else if (polygon.type == google.maps.drawing.OverlayType.RECTANGLE) {
      points = PolygonEditor.getPointsFromRectangle(this.props, polygon);
    }

    points = [PolygonEditor.googleToJSONLine(points)]
    let area = PolygonEditor.calculatePolygonArea(points);

    this.polygons.push(
      {
        "key": PolygonEditor.createKey(CUSTOM_KEY),
        "points": points,
        "area": area,
        "editable": false,
      }
    );
    polygon.overlay.setMap(null);
  }

  /**
   * Check if this layer contains a polygon. Avoid running unless necessary,
   * because some layers have many polygons to iterate through and this is
   * not an optimized operation.
   * @param {*} polygon The polygon to check for
   * @returns A boolean indicating whether the polygon exists in this layer
   */
  containsPolygon(polygon) {
    for (var i = 0; i < this.polygons.length; i++) {
      if (polygon === this.polygons[i]) {
        return true;
      }
    }
    return false;
  }
}
