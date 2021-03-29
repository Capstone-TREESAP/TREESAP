import React, { Component, useReducer, useState } from 'react';
import ReactDOM from 'react-dom';
import { Map, GoogleApiWrapper, Polygon, Marker, InfoWindow, Polyline, HeatMap } from 'google-maps-react';
import SettingsView from './settings';
import { DrawingView } from './drawing';
import { PolygonLayer } from './polygon-layer'
import { PolygonIntersection } from './polygon-intersection';
import { PolygonEditor } from './polygon-editor';
import './App.css';
// import { IntersectionReport } from './report';

var all_polygon_sets = {};
var neighborhood_polygons = {};
var polyKeys = [];
var polygons = [];
const data_url = "https://raw.githubusercontent.com/Capstone-TREESAP/TREESAP-Database/main/db.json"
const default_centre_coords = {lat: 49.26307, lng: -123.246655};

var CARBON_RATE = 30.600; // tonnes/hectare/year
var TREE_RUNOFF_RATE = 0.881; // L/m2/year
const SQUARE_METRE_TO_HECTARE = 10000; // m2/hectare
const gradient = [
  "rgba(0, 255, 255, 0)",
  "rgba(0, 255, 255, 1)",
  "rgba(0, 191, 255, 1)",
];

const colours = [
  "#1C55FF", //dark blue
  "#5CBF9B", //light green
  "#D9CA00", //yellow
  "#E03FCE", //pink
  "#00A6E8", //teal
  "#E68E00", //orange
  "#6530E3", //purple
  "#014421", //dark green
]

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
  console.log(database)
  var constants = database["Calculation Constants"];
  CARBON_RATE = parseFloat(constants["Carbon Sequestration Rate"]);
  TREE_RUNOFF_RATE = parseFloat(constants["Tree Run-off Effects Rate"]);
  neighborhood_polygons = database["Neighborhood Polygons"];
  all_polygon_sets = database["Tree Cover Polygon Datasets"];
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
            polygonLayers: null,
            intersectionLayer: null,
            editMode: false,
            carbonRate: CARBON_RATE,
            runoffRate: TREE_RUNOFF_RATE,
            editingIntersection: null,
            displayList: [],
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
            this.state.displayList.push(polyKeys[0])
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
        if(this.state.displayList.length != 1) {
          return;
        }
        //finding the index of the layer that is currently being displayed
        var index = polyKeys.indexOf(this.state.displayList[0]);
        this.state.polygonLayers[index].makeCurrentPolygonUneditable();
        let isIntersectionPolygon = (this.state.clickedIntersection != null)
        this.makeIntersectionUneditable(this.state.editingIntersection)

        if (isIntersectionPolygon && !this.state.polygonLayers[index].containsPolygon(polygon)) {
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
        this.state.polygonLayers[index].selectPolygon(this.state.clickedPolygon)
    };

    handleIntersectionClick = (intersection, map, coords) => {
      if (this.state.displayList.length != 1) {
        return;
      }
      var index = polyKeys.indexOf(this.state.displayList[0]);
        this.state.polygonLayers[index].makeCurrentPolygonUneditable();
        this.makeIntersectionUneditable(this.state.editingIntersection)

        this.setState({
            clickedLocation: coords,
            clickedPolygon: null,
            clickedIntersection: intersection,
            intersectionLayer: intersection.findIntersectingPolygons(this.state.polygonLayers[index].polygons)
        })
    }

    onGenericClick = () => {
      if (this.state.displayList.length != 1) {
        return;
      }
      var index = polyKeys.indexOf(this.state.displayList[0]);
        this.state.polygonLayers[index].makeCurrentPolygonUneditable();
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

    onAddAreaOfInterest = (name, coordinates) => {
        let intersection = new PolygonIntersection(this.props, coordinates, this._map.map, name)
        this.intersections.push(intersection)
        this.setState({
            clickedLocation: null,
            clickedPolygon: null,
            clickedIntersection: null,
            intersectionLayer: null,
        })
    }

    onRemoveAreaOfInterest = (name) => {
        if (this.state.clickedIntersection != null) {
            this.state.clickedIntersection.makeUneditable()
        }
        let index = this.intersections.findIndex(element => element.name === name)
        this.intersections.splice(index, 1);

        this.setState({
            clickedLocation: null,
            clickedIntersection: null,
            intersectionLayer: null,
        })
    }

    setPolygonLayer = (displayList) => {
      //making sure any info windows that are currently displayed are removed before changing which layers are displayed
      this.setState({
          clickedLocation: null,
          clickedPolygon: null,
          clickedIntersection: null,
          intersectionLayer: null,
          showInfoWindow: false,
      })
      //finding the index of the layer that is currently being displayed
      if (this.state.displayList.length > 0) {
        var index = polyKeys.indexOf(this.state.displayList[0]);
        this.state.polygonLayers[index].makeCurrentPolygonUneditable();
      }
      this.setState({
        displayList: displayList
      })
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
      var layersList = [];
      for(var polygons in polyKeys){
        layersList.push(new PolygonLayer(all_polygon_sets[polyKeys[polygons]], this.props, this._map.map))
      }
        this.setState({
            polygonLayers: layersList,
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
      var layerList = [];
        if (this.state.polygonLayers != null) {
          for (var poly in this.state.displayList) {
            var index = polyKeys.indexOf(this.state.displayList[poly]);
            layerList.push(this.displayPolygons(this.state.polygonLayers[index].polygons, colours[index], poly))
          }
            return layerList;
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
      if (this.state.displayList.length != 1) {
        return;
      }
      var index = polyKeys.indexOf(this.state.displayList[0]);
        this.state.polygonLayers[index].deletePolygon(polygon)
        this.setState({
            clickedLocation: null,
            clickedPolygon: null
        })
    }

    addPolygon(polygon) {
      if (this.state.displayList.length != 1) {
        this.drawingView.resetDrawingMode()
        return;
      }
      var index = polyKeys.indexOf(this.state.displayList[0]);
        if (this.state.editMode) {
            this.state.polygonLayers[index].addPolygon(polygon)
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
                intersectionLayer: intersection.findIntersectingPolygons(this.state.polygonLayers[index].polygons)
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
        var index = polyKeys.indexOf(this.state.displayList[0]);

        if (this.state.editMode) {
            buttons = (<div>
                <button className="info-window-button" type="button">Report Error</button>
                <button className="info-window-button" type="button" onClick={() => {this.state.polygonLayers[index].makePolygonEditable(polygon); this.onClose();}}>Edit</button>
                <button className="info-window-button" type="button" onClick={() => {this.deletePolygon(polygon); this.onClose();}}>Delete</button>
            </div>)
        } else {
            buttons = (<div>
                <button className="info-window-button" type="button">Report Error</button>
            </div>)
        }

        ReactDOM.render(React.Children.only(buttons), document.getElementById("iwc"))
    }

    onIntersectionInfoWindowOpen(intersection) {
        var buttons;
        // let report = new IntersectionReport(intersection.getBoundingLine(), this.state.intersectionLayer)

        //TODO this is hacky but works for now
        if (intersection.name == undefined) {
            buttons = (<div>
                <button className="info-window-button" type="button" onClick={()=> {this.makeIntersectionEditable(intersection); this.onClose();}}>Edit</button>
                <button className="info-window-button" type="button" onClick={()=> {this.deleteIntersection(intersection); this.onClose();}}>Delete</button>
                {/* {report.createReport()} */}
            </div>)
        } else {
            buttons = (<div>
                <button className="info-window-button" type="button" onClick={()=> {this.makeIntersectionEditable(intersection); this.onClose();}}>Edit</button>
                {/* {report.createReport()} */}
            </div>)
        }

        ReactDOM.render(React.Children.only(buttons), document.getElementById("iwc"))
    }

    renderInfoWindow() {
        if (this.state.clickedIntersection != null && this.state.intersectionLayer != null) {
            let totalArea = PolygonEditor.getTotalArea(this.state.intersectionLayer)
            let name = this.state.clickedIntersection.name
            return(<div>
                {name && <h3>Name: {name}</h3>}
                <h3>Total Area of Tree Cover: {totalArea ? totalArea : null} m<sup>2</sup></h3>
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
    if (this.state.polygonLayers == null || this.state.displayList.length < 1) {
        return null
    }

    var heatmap = [];
    var clusterMaker = require('clusters')
    var index = polyKeys.indexOf(this.state.displayList[0]);
    let positions = this.state.polygonLayers[index].positions;
    let polygons = this.state.polygonLayers[index].polygons;

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
                neighborhoodPolygonsList={neighborhood_polygons}
                onAddAreaOfInterest={this.onAddAreaOfInterest}
                onRemoveAreaOfInterest={this.onRemoveAreaOfInterest}
                polyList={polyKeys}
                displayList={this.state.displayList}
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
