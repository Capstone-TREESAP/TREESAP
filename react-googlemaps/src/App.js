import React, { Component, useReducer, useState } from 'react';
import ReactDOM from 'react-dom';
import { Map, GoogleApiWrapper, Polygon, Marker, InfoWindow, Polyline, HeatMap } from 'google-maps-react';
import SettingsView from './settings';
import { DrawingView } from './drawing';
import { PolygonLayer } from './polygon-layer'
import { PolygonIntersection } from './polygon-intersection';
import { PolygonEditor } from './polygon-editor';
// import { IntersectionReport } from './report';

var polygons = null;
var all_polygon_sets = {};
var neighborhood_polygons = {};
var displayList = [];
var polyKeys = [];
//var polyKeys = ["2018 LiDAR", "2018 Orthophoto"];
const data_url = "https://raw.githubusercontent.com/Capstone-TREESAP/TREESAP-Database/main/db.json"
const default_centre_coords = {lat: 49.2367, lng: -123.2031};

var CARBON_RATE = 30.600; // tonnes/hectare/year
var TREE_RUNOFF_RATE = 0.881; // L/m2/year
const SQUARE_METRE_TO_HECTARE = 10000; // m2/hectare
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

const points = [
  {
    lat: 0.0,
    lng: 0.0
  }
];

//TODO: The different colors should also be constants here
// Also different stroke weights, etc

const mapStyles = {
    width: '100%',
    height: '100%'
};

function parseDatabase(database) {
  //database = JSON.parse(database);
  console.log(database)
  var constants = database["Calculation Constants"];
  CARBON_RATE = parseFloat(constants["Carbon Sequestration Rate"]);
  TREE_RUNOFF_RATE = parseFloat(constants["Tree Run-off Effects Rate"]);
  neighborhood_polygons = database["Neighborhood Polygons"];
  all_polygon_sets = database["Tree Cover Polygon Datasets"];
  // remove after TIC-96
  polygons = all_polygon_sets["LiDAR 2018"];
  polyKeys = Object.keys(all_polygon_sets);
}

export class MapContainer extends Component {
    constructor(props) {
        super(props);
        this.state = {
            isLoaded: false,
            data: null,
            showInfoWindow: false, //Whether a polygon info window is shown
            clickedLocation: null,
            clickedPolygon: null,
            clickedIntersection: null,
            marker: null,
            polygonLayer: null,
            intersectionLayer: null,
            editMode: false,
            carbonRate: CARBON_RATE,
            runoffRate: TREE_RUNOFF_RATE,
            editingIntersection: null,
        };
        this.drawingView = null;
        this.intersections = [];
    }

    componentDidMount() {
      fetch(data_url)
        .then(res => res.json())
        .then(
          (result) => {
            this.setState({
              isLoaded: true
            });
            parseDatabase(result);
            this.loadPolygonLayer();
          },
          (error) => {
            console.log(error);
            this.setState({
              isLoaded: true,
              error
            });
          }
        )
    }

    //Functions for calculating ecosystem services
    getCarbonSequesteredAnnually = (area) => area / SQUARE_METRE_TO_HECTARE * this.state.carbonRate;
    getAvoidedRunoffAnnually = (area) => area * this.state.runoffRate;

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

    handleClick = (polygon, map, coords) => {
        this.state.polygonLayer.makeCurrentPolygonUneditable();
        let isIntersectionPolygon = (this.state.clickedIntersection != null)
        this.makeIntersectionUneditable(this.state.editingIntersection)

        if (isIntersectionPolygon && !this.state.polygonLayer.containsPolygon(polygon)) {
            //Treat it as a generic click to avoid displaying information about the wrong polygon
            this.onGenericClick()
            return
        }

        this.setState({
            clickedLocation: coords,
            clickedIntersection: null,
            intersectionLayer: null,
            clickedPolygon: polygon,
        })

        this.state.polygonLayer.selectPolygon(this.state.clickedPolygon)
    };

    handleIntersectionClick = (intersection, map, coords) => {
        this.state.polygonLayer.makeCurrentPolygonUneditable();
        this.makeIntersectionUneditable(this.state.editingIntersection)

        this.setState({
            clickedLocation: coords,
            clickedPolygon: null,
            clickedIntersection: intersection,
            intersectionLayer: intersection.findIntersectingPolygons(this.state.polygonLayer.polygons)
        })
    }

    onGenericClick = () => {
        this.state.polygonLayer.makeCurrentPolygonUneditable();
        this.makeIntersectionUneditable(this.state.editingIntersection)

        this.setState({
            clickedLocation: null,
            clickedPolygon: null,
            clickedIntersection: null,
            intersectionLayer: null,
            showInfoWindow: false,
        })
    }

    onToggleMode = (editMode) => {
        this.drawingView.resetDrawingMode()
        this.setState({
            editMode: editMode
        })
    }

    setPolygonLayer = (displayList) => {
      polygons = all_polygon_sets[displayList[0]];
    }

    onUpdateCarbon = (carbonValue) => {
      this.setState({
        carbonRate: carbonValue
      })
    }

    onUpdateRunoff = (runoffValue) => {
      this.setState({
        runoffRate: runoffValue
      })
    }

    loadPolygonLayer = () => {
        this.setState({
            polygonLayer: new PolygonLayer(polygons, this.props, this._map.map)
        })
    }

    loadDrawingManager = () => {
        this.drawingView = new DrawingView(this.props, this._map.map)

        const scope = this
        this.drawingView.drawingManager.addListener('overlaycomplete', function(polygon){
            scope.addPolygon(polygon);
        })
    }

    displayIntersections = () => {
      let features = [];
      for (var i = 0; i < this.intersections.length; i++) {
          features.push(this.displayIntersection(this.intersections[i], "#CC2828"))
      }

      if (this.state.intersectionLayer != null) {
          features.push(this.displayPolygons(this.state.intersectionLayer, "#CC2828", 1))
      }

      return features
    }

    displayPolygonLayer = () => {
        if (this.state.polygonLayer != null) {
            return this.displayPolygons(this.state.polygonLayer.polygons, "#014421", 0)
        }
    }

    //Display a set of polygons
    displayPolygons = (polygons, color, zIndex) => {
        return polygons.map(polygon =>
        <Polygon
            paths={polygon.points}
            key={polygon.key}
            onClick={(t, map, coords) =>
                this.handleClick(polygon, map, coords.latLng)
            }
            strokeColor={color}
            strokeOpacity={0.8}
            strokeWeight={2}
            fillColor={color}
            fillOpacity={0.65}
            editable={polygon.editable}
            zIndex={zIndex}
        />
        );
    }

    //Display a line
    displayIntersection = (intersection, color) => {
        let polyline = intersection.getBoundingLine()
        return (
        <Polyline
            path={polyline.coordinates}
            key={polyline.key}
            strokeColor={color}
            strokeOpacity={0.8}
            strokeWeight={5}
            onClick={(t, map, coords) =>
                this.handleIntersectionClick(intersection, map, coords.latLng)
            }
            zIndex={1}
        />
        )
    }

    deletePolygon(polygon) {
        this.state.polygonLayer.deletePolygon(polygon)
        this.setState({
            clickedLocation: null,
            clickedPolygon: null
        })
    }

    addPolygon(polygon) {
        if (this.state.editMode) {
            this.state.polygonLayer.addPolygon(polygon)
            this.setState({
                clickedLocation: null,
                clickedPolygon: null,
                clickedIntersection: null,
                intersectionLayer: null,
            })
        } else {
            let intersection = new PolygonIntersection(this.props, polygon, this._map.map)
            this.intersections.push(intersection)
            this.setState({
                clickedLocation: intersection.getBoundingLine().coordinates[0], //TODO this should probably not be so hardcoded
                clickedPolygon: null,
                clickedIntersection: intersection,
                intersectionLayer: intersection.findIntersectingPolygons(this.state.polygonLayer.polygons)
            })
            this.drawingView.resetDrawingMode()
        }
    }

    deleteIntersection(intersection) {
        intersection.makeUneditable()
        let index = this.intersections.findIndex(element => element === intersection)
        this.intersections.splice(index, 1);

        this.setState({
            clickedLocation: null,
            clickedIntersection: null,
            intersectionLayer: null,
        })
    }

    makeIntersectionEditable(intersection) {
        let index = this.intersections.findIndex(element => element === intersection)
        this.intersections.splice(index, 1);
        intersection.makeEditable()

        this.setState({
            clickedIntersection: null,
            editingIntersection: intersection,
            intersectionLayer: null,
        })
    }

    makeIntersectionUneditable(intersection) {
        if (intersection != null) {
            intersection.makeUneditable()
            this.intersections.push(intersection)
        }

        this.setState({
            editingIntersection: null,
        })
    }

    onInfoWindowOpen(polygon) {
        var buttons;

        if (this.state.editMode) {
            buttons = (<div>
                <button type="button">Report</button>
                <button type="button" onClick={() => {this.state.polygonLayer.makePolygonEditable(polygon); this.onClose();}}>Edit</button>
                <button type="button" onClick={() => {this.deletePolygon(polygon); this.onClose();}}>Delete</button>
            </div>)
        } else {
            buttons = (<div>
                <button type="button">Report</button>
            </div>)
        }

        ReactDOM.render(React.Children.only(buttons), document.getElementById("iwc"))
    }

    onIntersectionInfoWindowOpen(intersection) {
        var buttons;
        // let report = new IntersectionReport(intersection.getBoundingLine(), this.state.intersectionLayer)

        buttons = (<div>
            <button type="button" onClick={()=> {this.makeIntersectionEditable(intersection); this.onClose();}}>Edit</button>
            <button type="button" onClick={()=> {this.deleteIntersection(intersection); this.onClose();}}>Delete</button>
            {/* {report.createReport()} */}
        </div>)

        ReactDOM.render(React.Children.only(buttons), document.getElementById("iwc"))
    }

    renderInfoWindow() {
        if (this.state.clickedIntersection != null && this.state.intersectionLayer != null) {
            let totalArea = PolygonEditor.getTotalArea(this.state.intersectionLayer)
            return(<div>
                <h3>Total Area: {totalArea ? totalArea : null} m<sup>2</sup></h3>
                <h3>Total Carbon sequestered: {totalArea ? this.getCarbonSequesteredAnnually(totalArea).toFixed(2) : null} tonnes/year</h3>
                <h3>Total Avoided rainwater run-off: {totalArea ? this.getAvoidedRunoffAnnually(totalArea).toFixed(2) : null} litres/year</h3>
            </div>)
        } else {
            return(<div>
                <h3>Area: {this.state.clickedPolygon ? this.state.clickedPolygon.area : null} m<sup>2</sup></h3>
                <h3>Carbon sequestered: {this.state.clickedPolygon ? this.getCarbonSequesteredAnnually(this.state.clickedPolygon.area).toFixed(2) : null} tonnes/year</h3>
                <h3>Avoided rainwater run-off: {this.state.clickedPolygon ? this.getAvoidedRunoffAnnually(this.state.clickedPolygon.area).toFixed(2) : null} litres/year</h3>
            </div>)
        }
    }
    //TODO: fyi the heatmap doesn't change when polygons are added/deleted. Not sure why :(
  renderHeatmap = () => {
    if (this.state.polygonLayer == null) {
        return null
    }

    var heatmap = [];
    var clusterMaker = require('clusters')

    let positions = this.state.polygonLayer.positions;
    let polygons = this.state.polygonLayer.polygons;

    //for(var polygon in positions) {
    //  var numClusters = Math.ceil(polygons[polygon].area/50000);
    //  if (numClusters < 1) {
    //    numClusters = 1;
    //  }
    //  clusterMaker.k(numClusters);
    //  clusterMaker.iterations(300);
      //clusterMaker.data(positions[polygon]);
      //var allClusters = clusterMaker.clusters();
      //for (var cluster in allClusters) {
      //  heatmap.push(
          //{
          //  lat: allClusters[cluster].centroid[1],
          //  lng: allClusters[cluster].centroid[0],
          //  weight: numClusters,
          //}
        //)
      //}
    //}
    return (
      <HeatMap
        positions={points}
        gradient={gradient}
        opacity={1}
        radius={15}
      />
    );
  }

    render() {
        return (
        <Map
            google={this.props.google}
            ref={(map) => this._map = map}
            zoom={14}
            style={mapStyles}
            initialCenter={default_centre_coords}
            yesIWantToUseGoogleMapApiInternals
            onReady={() => {/*this.loadPolygonLayer();*/ this.loadDrawingManager();}}
            onClick={this.onGenericClick}
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
                onOpen={() => {this.state.clickedIntersection == null ?
                    this.onInfoWindowOpen(this.state.clickedPolygon) :
                    this.onIntersectionInfoWindowOpen(this.state.clickedIntersection)}}
            >
                <div id="iwc" />
                {this.renderInfoWindow()}
            </InfoWindow>
            <SettingsView
                onToggleMode={this.onToggleMode}
                polyList={polyKeys}
                displayList={displayList}
                setPolygonLayer={this.setPolygonLayer}
                onUpdateCarbon={this.onUpdateCarbon}
                onUpdateRunoff={this.onUpdateRunoff}
                carbonRate={this.state.carbonRate}
                runoffRate={this.state.runoffRate}
            />
            {this.displayPolygonLayer()}
            {this.displayIntersections()}
            {this.renderHeatmap()}
        </Map>
        );
    }
}

//Wrapper for map container
export default GoogleApiWrapper({
    apiKey: 'AIzaSyB8xmip8bwBsT_iqZ2-jBei-gwKNm5kR3A',
    libraries: ['drawing', 'geometry', 'visualization']
})(MapContainer);
