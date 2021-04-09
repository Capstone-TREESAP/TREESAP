import React, { Component } from 'react';
import ReactDOM from 'react-dom';
import { Map, GoogleApiWrapper, Polygon, Marker, InfoWindow, Polyline, HeatMap } from 'google-maps-react';
import SettingsView from './settings/settings';
import { DrawingView } from './polygons/drawing';
import { PolygonLayer } from './polygons/polygon-layer'
import { PolygonIntersection } from './polygons/polygon-intersection';
import { PolygonEditor } from './polygons/polygon-editor';
import './App.css';
import { IntersectionReport } from './pdf_report/report';
import * as turf from '@turf/turf'
import { Database } from './database';

const data_url = "https://raw.githubusercontent.com/Capstone-TREESAP/TREESAP-Database/database_redesign/db.json"
// const data_url = "https://raw.githubusercontent.com/Capstone-TREESAP/TREESAP-Database/main/db.json"
//const data_url = "https://raw.githubusercontent.com/Capstone-TREESAP/TREESAP-Database/8ded8e31e0892c2615893b9e925470cf0fcc59dc/db.json"
const default_centre_coords = {lat: 49.26307, lng: -123.246655};

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

const SHADING_LINE_COLOR = "#342C38";
const mapStyles = {
    width: '100%',
    height: '100%'
};

export class MapContainer extends Component {
    constructor(props) {
        super(props);
        this.state = {
            isLoaded: false,
            showInfoWindow: false, //Whether a polygon info window is shown
            clickedLocation: null,
            clickedPolygon: null,
            clickedIntersection: null,
            marker: null,
            intersectionLayer: null,
            editMode: false,
            editingIntersection: null,
            displayList: [],
            ready: false,
            database: new Database(),
            // shading/cooling state variables:
            buildingLayer: null,
            clickedBuilding: null,
            clickedShadingPolygon: null,
            clickedBuildingLocation: null,
            clickedShadingPolygonLocation: null,
            shadingMode: false
        };
        this.drawingView = null;
        this.intersections = [];
    }

    componentDidMount() {
      fetch(data_url)
        .then(res => res.json())
        .then(
          (result) => {
            this.state.database.parseDatabase(result, this.props)
            .then(() => {
                console.log("Database:", this.state.database)
                this.state.displayList.push(this.state.database.polyKeys[0])
                this.setState({
                    isLoaded: true
                })
                this.renderLegend();
            })
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
    getCarbonSequesteredAnnually = (area) => area / SQUARE_METRE_TO_HECTARE * this.state.database.carbonRate;
    getAvoidedRunoffAnnually = (area) => area * this.state.database.runoffRate;

    // 
    getShadelineLengthAndOrientation = () => {
        var buildingPoint = {
            "type": "Feature",
            "properties": {},
            "geometry": {
                "type": "Point",
                "coordinates": [this.state.clickedBuildingLocation.lng(), this.state.clickedBuildingLocation.lat()]
            }
        };
        
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
            ]
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
        console.log(cardinalDirection);
        return {
            "distance": distance,
            "direction": cardinalDirection
        }
    }

    onMarkerClick = (props, m, e) => {
        //TODO: disable editing so values update and bug doesn't happen
        console.log(m.position);
        this.setState({
            marker: m,
            showInfoWindow: true
        });
    }

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
          alert("Individual tree cluster information is not available while displaying multiple layers.")
          return;
        }
        //finding the index of the layer that is currently being displayed
        var index = this.state.database.getPolygonSetIndex(this.state.displayList[0]);
        this.state.database.polygonLayers[index].makeCurrentPolygonUneditable();
        let isIntersectionPolygon = (this.state.clickedIntersection != null)
        this.makeIntersectionUneditable(this.state.editingIntersection)

        if (isIntersectionPolygon && !this.state.database.polygonLayers[index].containsPolygon(polygon)) {
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
        this.state.database.polygonLayers[index].selectPolygon(this.state.clickedPolygon);
    };

    handleBuildingClick = (building, map, coords) => {
        // set the selected building/clicked location in state variables
        this.setState({
            clickedLocation: coords,
            clickedBuilding: building,
            clickedBuildingLocation: coords,
            clickedShadingPolygon: null,
            clickedShadingPolygonLocation: null
        })
        console.log("Handling a building being clicked on in shading mode. Here's what the state looks like right now: ");
        console.log(building);
        console.log(this.state);
    }

    handleShadingPolygonClick = (polygon, map, coords) => {
        // this handler should only be called if a building was previously clicked
        // by setting the selected polygon/clicked location, this enables us to draw a polyline and offer relative positioning info
        this.setState({
            clickedLocation: coords,
            clickedShadingPolygon: polygon,
            clickedShadingPolygonLocation: coords,
            clickedIntersection: null,
            intersectionLayer: null,
            clickedPolygon: polygon,
        });
        console.log("Handling a tree cluster being clicked on in shading mode, after building clicked on. Here's what the state looks like right now: ");
        console.log(this.state);
    }

    handleIntersectionClick = (intersection, map, coords) => {
      if (this.state.displayList.length != 1) {
        alert("Information about intersections and areas of interest is not available while displaying multiple layers.")
        return;
      }
      var index = this.state.database.getPolygonSetIndex(this.state.displayList[0]);
        this.state.database.polygonLayers[index].makeCurrentPolygonUneditable();
        this.makeIntersectionUneditable(this.state.editingIntersection)

        this.setState({
            clickedLocation: coords,
            clickedPolygon: null,
            clickedIntersection: intersection,
            intersectionLayer: intersection.findIntersectingPolygons(this.state.database.polygonLayers[index].polygons)
        })
    }

    onGenericClick = () => {
      if (this.state.displayList.length != 1) {
        return;
      }
      var index = this.state.database.getPolygonSetIndex(this.state.displayList[0]);
        this.state.database.polygonLayers[index].makeCurrentPolygonUneditable();
        this.makeIntersectionUneditable(this.state.editingIntersection)

        this.setState({
            clickedLocation: null,
            clickedPolygon: null,
            clickedIntersection: null,
            intersectionLayer: null,
            showInfoWindow: false,
            clickedBuilding: null,
            clickedBuildingLocation: null,
            clickedShadingPolygon: null,
            clickedShadingPolygonLocation: null
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
      let wasOneLayer = (this.state.displayList.length == 1)
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
        var index = this.state.database.getPolygonSetIndex(this.state.displayList[0]);
        this.state.database.polygonLayers[index].makeCurrentPolygonUneditable();
      }
      this.setState({
        displayList: displayList
      })

      //Remove drawing manager if more than one layer is going to be displayed
      if (displayList.length == 1) {
          if (!wasOneLayer) {
            this.loadDrawingManager()
          }
      } else {
        this.drawingView.closeDrawingManager()
      }
    }

    onUpdateCarbon = (carbonValue) => {
        this.state.database.carbonRate = carbonValue
    }

    onUpdateRunoff = (runoffValue) => {
        this.state.database.runoffRate = runoffValue
    }


    onToggleShadingMode = () => {
        console.log('changing shadingMode in app to ' + !this.state.shadingMode);
        // if not in shading mode, then toggle was clicked to enter shading mode, so render buildings
        if (!this.state.shadingMode) {
            this.loadBuildingLayer();
        
        // if in shading mode, then toggle was clicked to exit shading mode, so remove buildings
        } else {
            this.removeBuildingLayer();
        }

        this.setState({
            shadingMode: !this.state.shadingMode,
            showInfoWindow: false,
            clickedBuilding: null,
            clickedBuildingLocation: null,
            clickedShadingPolygon: null,
            clickedShadingPolygonLocation: null
        })
    }

    loadBuildingLayer = () => {
        this.setState({
            buildingLayer: new PolygonLayer(this.state.database.buildings, this.props, "building")
        })
    }

    removeBuildingLayer = () => {
        this.setState({
            buildingLayer: null
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
          features.push(this.displayIntersection(this.intersections[i], "#CC2828", this.state.displayList.length + 1))
      }

      if (this.state.intersectionLayer != null) {
          features.push(this.displayPolygons(this.state.intersectionLayer, "#CC2828", 1))
      }

      return features
    }

    displayPolygonLayer = () => {
      var layerList = [];
        if (this.state.isLoaded) {
          for (var poly in this.state.displayList) {
            var index = this.state.database.getPolygonSetIndex(this.state.displayList[poly]);
            layerList.push(this.displayPolygons(this.state.database.polygonLayers[index].polygons, colours[index], poly))
          }
            return layerList;
        }
    }

    displayBuildingLayer = () => {
        if (this.state.buildingLayer != null) {
            return this.displayPolygons(this.state.buildingLayer.polygons, "#6699CC", 0)
        }
    }

    //Display a set of polygons
    displayPolygons = (polygons, color, zIndex) => {
        return polygons.map(polygon =>
        <Polygon
            paths={polygon.points}
            key={polygon.key}
            onClick={(t, map, coords) => 
                {   
                    console.log(coords);
                    // if shading mode, then first check if a building has been clicked, and handle accordingly
                    if (this.state.shadingMode) {
                        if (polygon.type == "building") {
                            console.log("I think a building is being clicked on in shading mode.");
                            this.handleBuildingClick(polygon, map, coords.latLng);
                        /* if shading mode, and a tree cluster was clicked, check if a building was previously clicked
                           if so, we can draw a polyline, plant a marker, offer relative positioning info etc.*/
                        } else if (this.state.clickedBuilding) {
                            console.log("I think a tree cluster is being clicked on in shading mode, after a building was clicked on")
                            this.handleShadingPolygonClick(polygon, map, coords.latLng);
                        // if shading mode and a tree cluster was clicked without a building first being clicked, just behave as usual
                        } else {
                            console.log("I think a tree cluster is being clicked on in shading mode, before a building was clicked on")
                            this.handleClick(polygon, map, coords.latLng);
                        }
                    // if not shading mode, just handle tree polygon click as normal
                    } else {
                        console.log("Hey, I don't think we're in shading mode and I think a tree cluster is being clicked on")
                        this.handleClick(polygon, map, coords.latLng);
                    }
                }
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
    displayIntersection = (intersection, color, zIndex) => {
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
            zIndex={zIndex}
        />
        )
    }

    deletePolygon(polygon) {
      if (this.state.displayList.length != 1) {
        return;
      }
      var index = this.state.database.getPolygonSetIndex(this.state.displayList[0]);
        this.state.database.polygonLayers[index].deletePolygon(polygon)
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
      var index = this.state.database.getPolygonSetIndex(this.state.displayList[0]);
        if (this.state.editMode) {
            this.state.database.polygonLayers[index].addPolygon(polygon)
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
                intersectionLayer: intersection.findIntersectingPolygons(this.state.database.polygonLayers[index].polygons)
            })
        }
        this.drawingView.resetDrawingMode()
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
        var index = this.state.database.getPolygonSetIndex(this.state.displayList[0]);

        if (this.state.editMode) {
            buttons = (<div>
                <button className="info-window-button" type="button" onClick={() => {this.state.database.polygonLayers[index].makePolygonEditable(polygon, this._map.map); this.onClose();}}>Edit</button>
                <button className="info-window-button" type="button" onClick={() => {this.deletePolygon(polygon); this.onClose();}}>Delete</button>
            </div>)
            ReactDOM.render(React.Children.only(buttons), document.getElementById("iwc"))

        }

    }


    onIntersectionInfoWindowOpen(intersection) {
        var buttons;
        let index = this.state.database.getPolygonSetIndex(this.state.displayList[0])
        let polygonLayerName = this.state.database.polyKeys[index]
        let report = new IntersectionReport(this.props, intersection.getBoundingLine(), this.state.intersectionLayer, this.state.database.carbonRate, this.state.database.runoffRate, polygonLayerName)

        //TODO this is hacky but works for now
        if (intersection.name == undefined) {
            buttons = (<div>
                <button className="info-window-button" type="button" onClick={()=> {this.makeIntersectionEditable(intersection); this.onClose();}}>Edit</button>
                <button className="info-window-button" type="button" onClick={()=> {this.deleteIntersection(intersection); this.onClose();}}>Delete</button>
                {report.displayReportButton()}
            </div>)
        } else {
            buttons = (<div>
                <button className="info-window-button" type="button" onClick={()=> {this.makeIntersectionEditable(intersection); this.onClose();}}>Edit</button>
                {report.displayReportButton()}
            </div>)
        }

        ReactDOM.render(React.Children.only(buttons), document.getElementById("iwc"))
    }

    renderInfoWindow() {
        var findPolygonCentroid = (polygon) => {
            if (polygon) {
                var polygonGeoJSON = {
                    "type": "Feature",
                    "geometry": {
                        "type": "Polygon",
                        "coordinates": [[]]
                    }
                }
                for (var i = 0; i < polygon.points.length; i ++) {
                    polygonGeoJSON.geometry.coordinates[0].push([polygon.points[i].lng, polygon.points[i].lat]);
                }
                return turf.centroid(polygonGeoJSON);
            }
            return null;
        }

        if (this.state.clickedIntersection != null && this.state.intersectionLayer != null) {
            let totalArea = PolygonEditor.getTotalArea(this.state.intersectionLayer)
            let name = this.state.clickedIntersection.name
            return(<div>
                {name && <h3>Name: {name}</h3>}
                <h3>Total Area of Tree Cover: </h3><p>{totalArea ? totalArea : null} m<sup>2</sup></p>
                <h3>Total Carbon sequestered: </h3><p>{totalArea ? this.getCarbonSequesteredAnnually(totalArea).toFixed(2) : null} tonnes/year</p>
                <h3>Total Avoided rainwater run-off: </h3><p>{totalArea ? this.getAvoidedRunoffAnnually(totalArea).toFixed(2) : null} litres/year</p>
            </div>) 
        } else if (this.state.shadingMode && this.state.clickedBuildingLocation) {
            if (this.state.clickedShadingPolygonLocation) {
                var relative_position = this.getShadelineLengthAndOrientation();
                console.log(relative_position);
                var distance = relative_position.distance.toFixed(2);
                var direction = relative_position.direction;
                var centroid = findPolygonCentroid(this.state.clickedShadingPolygon);
                var lat = centroid ? centroid.geometry.coordinates[1].toFixed(8) : null;
                var lng = centroid ? centroid.geometry.coordinates[0].toFixed(8) : null;
                return(<div className="info-window">
                    <h3>{this.state.clickedBuilding.name}</h3>
                    <p>{this.state.clickedBuilding.address}</p>
                    <h3>Tree Cluster Centre Coordinates: </h3><p>Latitude: {lat}</p><p>Longitude: {lng}</p>
                    <h3>This tree cluster is {distance} metres {direction} of {this.state.clickedBuilding.name}</h3>
                </div>) 
            } else {
                var occupied_date = this.state.clickedBuilding.occupied_date;
                return(<div className="info-window">
                    <h3>{this.state.clickedBuilding.name}</h3>
                    <p>{this.state.clickedBuilding.address}</p>
                    <h3>Neighbourhood: </h3><p>{this.state.clickedBuilding.neighbourhood ? this.state.clickedBuilding.neighbourhood : "Unknown"}</p>
                    <h3>Date Occupied (yyyy/mm/dd): </h3><p>{occupied_date ? occupied_date.substring(0, 4) + "/" + occupied_date.substring(4, 6) + "/" + occupied_date.substring(6, 8) : "Unknown"}</p>
                    <h3>Maximum Floors: </h3><p>{this.state.clickedBuilding.max_floors ? this.state.clickedBuilding.max_floors : "Unknown"}</p>
                </div>) 
            }
        } else {
            var centroid = findPolygonCentroid(this.state.clickedPolygon);
            var lat = centroid ? centroid.geometry.coordinates[1].toFixed(8) : null;
            var lng = centroid ? centroid.geometry.coordinates[0].toFixed(8) : null;

            return(<div>
                <h3>Area: </h3><p>{this.state.clickedPolygon ? this.state.clickedPolygon.area : null} m<sup>2</sup></p>
                <h3>Carbon sequestered: </h3><p>{this.state.clickedPolygon ? this.getCarbonSequesteredAnnually(this.state.clickedPolygon.area).toFixed(2) : null} tonnes/year</p>
                <h3>Avoided rainwater run-off: </h3><p>{this.state.clickedPolygon ? this.getAvoidedRunoffAnnually(this.state.clickedPolygon.area).toFixed(2) : null} litres/year</p>
                <h3>Tree Cluster Centre Coordinates: </h3><p>Latitude: {lat}</p><p>Longitude: {lng}</p>
            </div>)
        }
    }
    
    //TODO: fyi the heatmap doesn't change when polygons are added/deleted. Not sure why :(
  renderHeatmap = () => {
    if (this.state.database.polygonLayers == null || this.state.displayList.length < 1) {
        return null
    }

    var heatmap = [];
    var clusterMaker = require('clusters')
    var index = this.state.database.getPolygonSetIndex(this.state.displayList[0]);
    let positions = this.state.database.polygonLayers[index].positions;
    let polygons = this.state.database.polygonLayers[index].polygons;

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

  renderLegend = () => {
    var legend = [];
    for (var polyLayer in this.state.displayList) {
      legend.push(this.renderListItem(this.state.database.getPolygonSetIndex(this.state.displayList[polyLayer])))
    }
    return legend;
  }

  renderListItem = (item) => {
    return(
      <div className="row">
        <div className="legend" style={{color: "black"}}>
          <p>{this.state.database.polyKeys[item]}</p>
        </div>
        <div className="colour-square" style={{backgroundColor: colours[item], color: colours[item]}}/>
      </div>
    )
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
            onReady={() => {this.setState({ready: true}); this.loadDrawingManager();}}
            onClick={this.onGenericClick}
        >   
            <Marker
                onClick={this.onMarkerClick}
                visible={this.state.clickedLocation != null}
                position={this.state.clickedLocation }
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
            <Polyline
                visible={this.state.clickedBuildingLocation && this.state.clickedShadingPolygonLocation}
                path={[this.state.clickedBuildingLocation, this.state.clickedShadingPolygonLocation]}
                strokeColor={SHADING_LINE_COLOR}
                strokeOpacity={0.8}
                strokeWeight={5}
                zIndex={2}
            />
            <SettingsView
                onToggleMode={this.onToggleMode}
                neighborhoodPolygonsList={this.state.database.neighborhood_polygons}
                onAddAreaOfInterest={this.onAddAreaOfInterest}
                onRemoveAreaOfInterest={this.onRemoveAreaOfInterest}
                polyList={this.state.database.polyKeys}
                displayList={this.state.displayList}
                setPolygonLayer={this.setPolygonLayer}
                onUpdateCarbon={this.onUpdateCarbon}
                onUpdateRunoff={this.onUpdateRunoff}
                carbonRate={this.state.database.carbonRate}
                runoffRate={this.state.database.runoffRate}
                onToggleShadingMode={this.onToggleShadingMode}
            />
            {this.state.ready && this.displayPolygonLayer()}
            {this.displayBuildingLayer()}
            {this.displayIntersections()}
            {this.renderHeatmap()}
            <div className="legend-container">
              <div className="row">
                <h3 id="legend-text">Legend</h3>
              </div>
              {this.state.ready && this.renderLegend()}
            </div>
        </Map>
        );
    }
}

//Wrapper for map container
export default GoogleApiWrapper({
    apiKey: 'AIzaSyB8xmip8bwBsT_iqZ2-jBei-gwKNm5kR3A',
    libraries: ['drawing', 'geometry', 'visualization']
})(MapContainer);
