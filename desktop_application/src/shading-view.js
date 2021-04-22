import { Polyline } from 'google-maps-react';
import { PolygonEditor } from './polygons/polygon-editor';
import { PolygonLayer } from './polygons/polygon-layer';
import * as turf from '@turf/turf';

const SHADING_LINE_COLOR = "#342C38";

/**
 * Implements the shading and cooling mode functionality.
 */
export class ShadingView {
  constructor() {
    this.buildingLayer = null;
    this.clickedBuilding = null;
    this.clickedShadingPolygon = null;
    this.clickedBuildingLocation = null;
    this.clickedShadingPolygonLocation = null;
  }

  /**
   * Get the distance and direction from the currently selected building to the currently selected
   * tree cluster.
   * @returns A JSON object containing the distance and direction
   */
  getShadelineLengthAndOrientation = () => {
    var buildingPoint = {
      "type": "Feature",
      "properties": {},
      "geometry": {
        "type": "Point",
        "coordinates": [this.clickedBuildingLocation.lng(), this.clickedBuildingLocation.lat()]
      }
    }

    var treePoint = {
      "type": "Feature",
      "properties": {},
      "geometry": {
        "type": "Point",
        "coordinates": [this.clickedShadingPolygonLocation.lng(), this.clickedShadingPolygonLocation.lat()]
      }
    };
    // get distance between points, in meters
    var distance = turf.distance(buildingPoint, treePoint, "kilometers") * 1000.0;
    var direction = turf.bearing(buildingPoint, treePoint);

    var getCardinalDirection = (angle) => {
      var smallest_angle = 180.0;
      var direction = null;
      var cardinalDirections =
      [
        ["north", 0.0],
        ["northeast", 45.0],
        ["east", 90.0],
        ["southeast", 135.0],
        ["south", 180.0],
        ["south", -180.0],
        ["southwest", -135],
        ["west", -90.0],
        ["northwest", -45.0]
      ];
      var diff =  (a, b) => a > b ? a - b : b - a;

      for (var i = 0; i < cardinalDirections.length; i++) {
        var angle_difference = diff(angle, cardinalDirections[i][1]);
        if (angle_difference < smallest_angle) {
          smallest_angle = angle_difference;
          direction = cardinalDirections[i][0];
        }
      }
      return direction;
    }
    var cardinalDirection = getCardinalDirection(direction);
    return {
      "distance": distance,
      "direction": cardinalDirection,
    }
  }

  /**
   * Called when a building is clicked on
   * @param {*} building The building that was clicked
   * @param {*} coords The specific coordinates that were clicked
   */
  handleBuildingClick(building, coords) {
    this.clickedBuilding = building;
    this.clickedBuildingLocation = coords;
    this.clickedShadingPolygon = null;
    this.clickedShadingPolygonLocation = null;
  }

  /**
   * Called when a tree cover polygon is clicked on AFTER a building
   * @param {*} polygon The polygon that was clicked
   * @param {*} coords The specific coordinates that were clicked
   */
  handleShadingPolygonClick(polygon, coords) {
    this.clickedShadingPolygon = polygon;
    this.clickedShadingPolygonLocation = coords;
  }

  /**
   * Create a polygon layer for the buildings to display on the map.
   * Called when shading mode is entered
   * @param {*} props A list of properties to pass to the polygon layer
   * @param {*} buildings The list of buildings to parse
   */
  loadBuildingLayer = (props, buildings) => {
    this.buildingLayer = new PolygonLayer(buildings, props, "building");
    this.clickedBuilding = null;
    this.clickedBuildingLocation = null;
    this.clickedShadingPolygon = null;
    this.clickedShadingPolygonLocation = null;
  }

  /**
   * Remove the building layer from the map. Called when shading mode
   * is exited.
   */
  removeBuildingLayer = () => {
    this.buildingLayer = null;
    this.clickedBuilding = null;
    this.clickedBuildingLocation = null;
    this.clickedShadingPolygon = null;
    this.clickedShadingPolygonLocation = null;
  }

  /**
   * Gets the list of building polygons, if the layer currently exists
   * @returns A list of polygons in JSON format representing buildings
   */
  getBuildings() {
    if (this.buildingLayer != null) {
      return this.buildingLayer.polygons
    }
  }

  /**
   * Resets all clicked objects to null
   */
  clickOffBuilding() {
    this.clickedBuilding = null;
    this.clickedBuildingLocation = null;
    this.clickedShadingPolygon = null;
    this.clickedShadingPolygonLocation = null;
  }

  /**
   * Checks whether there is currently a building selected
   */
  buildingHasBeenClicked() {
    return (this.clickedBuilding != null && this.clickedBuildingLocation != null)
  }

  /**
   * Checks whether there is currently a tree cover polygon selected
   */
  shadingPolygonHasBeenClicked() {
    return (this.clickedShadingPolygon != null && this.clickedShadingPolygonLocation != null)
  }

  /**
   * Create the info window text for a tree cover polygon clicked after a building.
   * This contains information about the building clicked, and the distance
   * and direction of tree cover from the building
   * @returns Text to render in an info window
   */
  createShadingPolygonInfoWindow() {
    let relative_position = this.getShadelineLengthAndOrientation();
    let distance = relative_position.distance.toFixed(2);
    let direction = relative_position.direction;
    let centroid = PolygonEditor.findPolygonCentroid(this.clickedShadingPolygon);
    let lat = centroid ? centroid.geometry.coordinates[1].toFixed(8) : null;
    let lng = centroid ? centroid.geometry.coordinates[0].toFixed(8) : null;

    return (
      <div className="info-window">
        <h3>{this.clickedBuilding.name}</h3>
        <p>{this.clickedBuilding.address}</p>
        <h3>Tree Cluster Centre Coordinates: </h3><p>Latitude: {lat}</p><p>Longitude: {lng}</p>
        <h3>This tree cluster is {distance} metres {direction} of {this.clickedBuilding.name}</h3>
      </div>
    );
  }

  /**
   * Creates the info window text for a building.
   * @returns Text to render in an info window
   */
  createBuildingInfoWindow() {
    let occupied_date = this.clickedBuilding.occupied_date;
    return (
      <div className="info-window">
        <h3>{this.clickedBuilding.name}</h3>
        <p>{this.clickedBuilding.address}</p>
        <h3>Neighbourhood: </h3><p>{this.clickedBuilding.neighbourhood ? this.clickedBuilding.neighbourhood : "Unknown"}</p>
        <h3>Date Occupied (yyyy/mm/dd): </h3><p>{occupied_date ? occupied_date.substring(0, 4) + "/" + occupied_date.substring(4, 6) + "/" + occupied_date.substring(6, 8) : "Unknown"}</p>
        <h3>Maximum Floors: </h3><p>{this.clickedBuilding.max_floors ? this.clickedBuilding.max_floors : "Unknown"}</p>
      </div>
    );
  }

  /**
   * Displays the line between the clicked building and clicked tree cover polygon,
   * if they both exist
   * @returns A polyline to render
   */
  displayBuildingToPolygonLine() {
    return (
      <Polyline
        visible={this.buildingHasBeenClicked() && this.shadingPolygonHasBeenClicked()}
        path={this.getPathBetweenBuildingAndPolygon()}
        strokeColor={SHADING_LINE_COLOR}
        strokeOpacity={0.8}
        strokeWeight={5}
        zIndex={2}
      />
    );
  }

  /**
   * Creates a line based on the coordinates of the clicked building and tree cover polygon
   * @returns The points of a line between the two clicked objects
   */
  getPathBetweenBuildingAndPolygon() {
    if (this.buildingHasBeenClicked() && this.shadingPolygonHasBeenClicked()) {
      return [this.clickedBuildingLocation, this.clickedShadingPolygonLocation];
    } else {
      return [];
    }
  }

}