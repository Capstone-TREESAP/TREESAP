import { Polyline } from 'google-maps-react';
import { PolygonEditor } from './polygons/polygon-editor';
import { PolygonLayer } from './polygons/polygon-layer';
import * as turf from '@turf/turf';

const SHADING_LINE_COLOR = "#342C38";

export class ShadingView {
  constructor() {
    this.state = {
      buildingLayer: null,
      clickedBuilding: null,
      clickedShadingPolygon: null,
      clickedBuildingLocation: null,
      clickedShadingPolygonLocation: null,
    };  
  }

  getShadelineLengthAndOrientation = () => {
    var buildingPoint = {
      "type": "Feature",
      "properties": {},
      "geometry": {
        "type": "Point",
        "coordinates": [this.state.clickedBuildingLocation.lng(), this.state.clickedBuildingLocation.lat()]
      }
    }

    var treePoint = {
      "type": "Feature",
      "properties": {},
      "geometry": {
        "type": "Point",
        "coordinates": [this.state.clickedShadingPolygonLocation.lng(), this.state.clickedShadingPolygonLocation.lat()]
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

  handleBuildingClick(building, coords) {
    this.state.clickedBuilding = building;
    this.state.clickedBuildingLocation = coords;
    this.state.clickedShadingPolygon = null;
    this.state.clickedShadingPolygonLocation = null;
  }

  handleShadingPolygonClick(polygon, coords) {
    // this handler should only be called if a building was previously clicked
    // by setting the selected polygon/clicked location, this enables us to draw a polyline and offer relative positioning info
    this.state.clickedShadingPolygon = polygon;
    this.state.clickedShadingPolygonLocation = coords;
  }

  loadBuildingLayer = (props, buildings) => {
    this.state.buildingLayer = new PolygonLayer(buildings, props, "building");
    this.state.clickedBuilding = null;
    this.state.clickedBuildingLocation = null;
    this.state.clickedShadingPolygon = null;
    this.state.clickedShadingPolygonLocation = null;
  }

  removeBuildingLayer = () => {
    this.state.buildingLayer = null;
    this.state.clickedBuilding = null;
    this.state.clickedBuildingLocation = null;
    this.state.clickedShadingPolygon = null;
    this.state.clickedShadingPolygonLocation = null;
  }

  getBuildings() {
    if (this.state.buildingLayer != null) {
      return this.state.buildingLayer.polygons
    }
  }

  clickOffBuilding() {
    this.state.clickedBuilding = null;
    this.state.clickedBuildingLocation = null;
    this.state.clickedShadingPolygon = null;
    this.state.clickedShadingPolygonLocation = null;
  }

  buildingHasBeenClicked() {
    return (this.state.clickedBuilding != null && this.state.clickedBuildingLocation != null)
  }

  shadingPolygonHasBeenClicked() {
    return (this.state.clickedShadingPolygon != null && this.state.clickedShadingPolygonLocation != null)
  }

  createShadingPolygonInfoWindow() {
    let relative_position = this.getShadelineLengthAndOrientation();
    let distance = relative_position.distance.toFixed(2);
    let direction = relative_position.direction;
    let centroid = PolygonEditor.findPolygonCentroid(this.state.clickedShadingPolygon);
    let lat = centroid ? centroid.geometry.coordinates[1].toFixed(8) : null;
    let lng = centroid ? centroid.geometry.coordinates[0].toFixed(8) : null;

    return (
      <div className="info-window">
        <h3>{this.state.clickedBuilding.name}</h3>
        <p>{this.state.clickedBuilding.address}</p>
        <h3>Tree Cluster Centre Coordinates: </h3><p>Latitude: {lat}</p><p>Longitude: {lng}</p>
        <h3>This tree cluster is {distance} metres {direction} of {this.state.clickedBuilding.name}</h3>
      </div>
    );
  }

  createBuildingInfoWindow() {
    let occupied_date = this.state.clickedBuilding.occupied_date;
    return (
      <div className="info-window">
        <h3>{this.state.clickedBuilding.name}</h3>
        <p>{this.state.clickedBuilding.address}</p>
        <h3>Neighbourhood: </h3><p>{this.state.clickedBuilding.neighbourhood ? this.state.clickedBuilding.neighbourhood : "Unknown"}</p>
        <h3>Date Occupied (yyyy/mm/dd): </h3><p>{occupied_date ? occupied_date.substring(0, 4) + "/" + occupied_date.substring(4, 6) + "/" + occupied_date.substring(6, 8) : "Unknown"}</p>
        <h3>Maximum Floors: </h3><p>{this.state.clickedBuilding.max_floors ? this.state.clickedBuilding.max_floors : "Unknown"}</p>
      </div>
    );
  }

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

  getPathBetweenBuildingAndPolygon() {
    if (this.buildingHasBeenClicked() && this.shadingPolygonHasBeenClicked()) {
      return [this.state.clickedBuildingLocation, this.state.clickedShadingPolygonLocation];
    } else {
      return [];
    }
  }

}