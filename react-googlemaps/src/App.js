import React, { Component } from 'react';
import { Map, GoogleApiWrapper, Polygon, Marker, InfoWindow, HeatMap } from 'google-maps-react';
import polygons from './random_polygons.json';

const CARBON_RATE = 30.600; // tonnes/hectare/year
const SQUARE_METRE_TO_HECTARE = 10000; // m2/hectare
const TREE_RUNOFF_EFFECTS = 0.881 // L/m2/year
const gradient = [
  "rgba(0, 255, 255, 0)",
  "rgba(0, 255, 255, 1)",
  "rgba(0, 191, 255, 1)",
  "rgba(0, 127, 255, 1)",
  "rgba(0, 63, 255, 1)",
  "rgba(0, 0, 255, 1)",
  "rgba(0, 0, 223, 1)",
  "rgba(0, 0, 191, 1)",
  "rgba(0, 0, 159, 1)",
  "rgba(0, 0, 127, 1)",
  "rgba(63, 0, 91, 1)",
  "rgba(127, 0, 63, 1)",
  "rgba(191, 0, 31, 1)",
  "rgba(255, 0, 0, 1)"
];

var collectedPolygons = [];

function parsePolygons(polygons){
  console.log("hi o/");
  var positions = [];

  for(var i = 0; i < polygons.features.length; i++) {

    var polygon = polygons.features[i].geometry.coordinates[0];
    var area = polygons.features[i].properties.area;
    var points = [];
    var rawPoints = [];
    for(var point in polygon) {
      points.push(
        {
          lat: parseFloat(polygon[point][1]),
          lng: parseFloat(polygon[point][0])
        }
      );
      //console.log(polygon[point]);
      rawPoints.push(polygon[point]);
    }
    collectedPolygons.push(
      {
        "id": i,
        "points": points,
        "area": area
      }
    )
    positions.push(rawPoints);
  }
  return positions;
};
var positions = parsePolygons(polygons);

/*function parseCentroid(polygons){
  var positions = [];

  for(var i = 0; i < polygons.features.length; i++) {

    var polygon = polygons.features[i].geometry.coordinates[0];
    var area = polygons.features[i].properties.area;
    var lat = 0;
    var lon = 0;
    var f = 0;
    var g, j;
    for(g = 0, j = polygon.length - 1; g < polygon.length; j=g, g++) {
      var x1 = parseFloat(polygon[g][1]);
      var y1 = parseFloat(polygon[g][0]);
      var x2 = parseFloat(polygon[j][1]);
      var y2 = parseFloat(polygon[j][0]);
      f = x1 * y2 - x2 * y1;
      lat += (x1 + x2) * f;
      lon += (y1 + y2) * f;
    }
    f = area * 6.0;
    lat = lat / f;
    lon = lon / f;
    positions.push(
      {
        lat: lat,
        lng: lon
      }
    )
    console.log("lat: ", lat, "lon: ", lon);
  }
  return positions;
};*/

//var positions = parseCentroid(polygons);

const mapStyles = {
  width: '100%',
  height: '100%'
};

export class MapContainer extends Component {
  state = {
    showInfoWindow: false,
    clickedLocation: null,
    marker: null,
    polygon: null,
  };
  getCarbonSequesteredAnnually = (area) => area / SQUARE_METRE_TO_HECTARE * CARBON_RATE;
  getAvoidedRunoffAnnually = (area) => area * TREE_RUNOFF_EFFECTS;
  onMarkerClick = (props, m, e) =>
    this.setState({
      marker: m,
      showInfoWindow: true
  });
  onClose = props => {
    if (this.state.showInfoWindow) {
      this.setState({
        showInfoWindow: false,
        marker: null
      });
    }
  };
  handleClick =
  (polygon, map, coords) => {
    this.setState({
      clickedLocation: coords,
      showInfoWindow: this.state.showInfoWindow,
      polygon: polygon
    })
  };
  displayPolygons = () => collectedPolygons
  .map(polygon =>
  <Polygon
    paths={polygon.points}
    key={polygon.id}
    onClick={(t, map, coords) =>
      this.handleClick(polygon, map, coords.latLng)
    }
    strokeColor="#014421"
    strokeOpacity={0.8}
    strokeWeight={2}
    fillColor="#014421"
    fillOpacity={0.65}
  />)

  renderHeatmap = () => {
    var heatmap = [];
    var clusterMaker = require('clusters')
    for(var polygon in positions) {
      var numClusters = Math.ceil(collectedPolygons[polygon].area/100000);
      if (numClusters < 1) {
        numClusters = 1;
      }
       else {
         if (numClusters > 100) {
           numClusters = 100;
         }
       }
      clusterMaker.k(numClusters);
      clusterMaker.iterations(100);
      //console.log(positions[polygon]);
      clusterMaker.data(positions[polygon]);
      //console.log(clusterMaker.clusters());
      var allClusters = clusterMaker.clusters();
      //console.log(allClusters);
      for (var cluster in allClusters) {
        //console.log(allClusters[cluster].centroid);
        heatmap.push(
          {
            lat: allClusters[cluster].centroid[1],
            lng: allClusters[cluster].centroid[0],
            weight: numClusters,
          }
        )
      }
    }
    /*for(var polygon in collectedPolygons) {
      var bounds = new this.props.google.maps.LatLngBounds();
      for (var i = 0; i < collectedPolygons[polygon].points.length; i++) {
        bounds.extend(collectedPolygons[polygon].points[i]);
      }
      var center = bounds.getCenter();
      heatmap.push(
        {
          lat: center.lat(),
          lng: center.lng(),
          weight: collectedPolygons[polygon].area / totalArea * 10,
        }
      );
    }*/
    return (
      <HeatMap
        positions={heatmap}
        gradient={gradient}
        opacity={1}
        radius={20}
      />
    );
  }



  render() {
    return (
      <Map
        google={this.props.google}
        zoom={14}
        style={mapStyles}
        initialCenter={
          {
            lat: 49.2367,
            lng: -123.2031
          }
        }
        >
        <Marker
          onClick={this.onMarkerClick}
          visible={this.state.clickedLocation != null}
          position={this.state.clickedLocation}
        />
        <InfoWindow
          visible={this.state.showInfoWindow}
          marker={this.state.marker}
          onClose={this.onClose}
        >
            <div>
              <h3>Area: {this.state.polygon ? this.state.polygon.area : null} m<sup>2</sup></h3>
              <h3> Carbon sequestered: {this.state.polygon ? this.getCarbonSequesteredAnnually(this.state.polygon.area).toFixed(2) : null} tonnes/year</h3>
              <h3> Avoided rainwater run-off: {this.state.polygon ? this.getAvoidedRunoffAnnually(this.state.polygon.area).toFixed(2) : null} litres/year</h3>
            </div>
            <button type="button">Report</button>
        </InfoWindow>
        {this.displayPolygons()}
        {this.renderHeatmap()}
      </Map>
    );
  }
}
export default GoogleApiWrapper({
  apiKey: 'AIzaSyB8xmip8bwBsT_iqZ2-jBei-gwKNm5kR3A',
  libraries: ["visualization"]
})(MapContainer);
