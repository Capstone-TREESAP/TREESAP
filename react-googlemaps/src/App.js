import React, { Component } from 'react';
import { Map, GoogleApiWrapper, Polygon } from 'google-maps-react';
import polygons from './random_polygons.json';

const CARBON_RATE = 30.600; // tonnes/hectare/year
const SQUARE_METRE_TO_HECTARE = 10000; // m2/hectare
const TREE_RUNOFF_EFFECTS = 0.881 // L/m2/year

var collectedPolygons = []
function collectPolygons(polygons){
  for(var i = 0; i < polygons.features.length; i++) {

    var polygon = polygons.features[i].geometry.coordinates[0];
    var area = polygons.features[i].properties.area;
    var points = [];
    for(var point in polygon) {
      points.push(
        {
          lat: parseFloat(polygon[point][1]),
          lng: parseFloat(polygon[point][0])
        }
      )
    }
    collectedPolygons.push(
      {
        "id": i,
        "points": points,
        "area": area
      }
    )
  }
};
collectPolygons(polygons);

const mapStyles = {
  width: '100%',
  height: '100%'
};

export class MapContainer extends Component {
  state = {
    showingInfoWindow: false,
    selectedPolygon: {}
  };
  getCarbonSequesteredAnnually = (area) => area / SQUARE_METRE_TO_HECTARE * CARBON_RATE;
  getAvoidedRunoffAnnually = (area) => area * TREE_RUNOFF_EFFECTS;
  displayPolygons = () => collectedPolygons
  .map(polygon => 
  <Polygon
    paths={polygon.points}
    key={polygon.id}
    onClick={()=>alert("Area: " + polygon.area + " square metres\n" + "Carbon sequestered: " + this.getCarbonSequesteredAnnually(polygon.area).toFixed(2) + " tonnes per year\n" + "Avoided Run-off: " + this.getAvoidedRunoffAnnually(polygon.area).toFixed(2) + " litres per year")}
    strokeColor="#014421"
    strokeOpacity={0.8}
    strokeWeight={2}
    fillColor="#014421"
    fillOpacity={0.65}
  />)
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
        {
          this.displayPolygons()
        }
      </Map>
    );
  }
}


export default GoogleApiWrapper({
  apiKey: 'YOUR_API_KEY_HERE'
})(MapContainer);
