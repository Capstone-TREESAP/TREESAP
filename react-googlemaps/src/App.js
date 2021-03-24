import React, { Component, useReducer, useState } from 'react';
import ReactDOM from 'react-dom';
import { Map, GoogleApiWrapper, Polygon, Marker, InfoWindow, Polyline } from 'google-maps-react';
import polygons from './lidar_polygons.json';
import SettingsView from './settings';
import { DrawingView } from './drawing';
import { PolygonLayer } from './polygon-layer'
import { PolygonIntersection } from './polygon-intersection';
import { PolygonEditor } from './polygon-editor';

const CARBON_RATE = 30.600; // tonnes/hectare/year
const SQUARE_METRE_TO_HECTARE = 10000; // m2/hectare
const TREE_RUNOFF_EFFECTS = 0.881 // L/m2/year

//TODO: The different colors should also be constants here
// Also different stroke weights, etc

var currLineID = 90000000

const mapStyles = {
    width: '100%',
    height: '100%'
};

export class MapContainer extends Component {
    constructor(props) {
        super(props);
        this.state = {
            showInfoWindow: false, //Whether a polygon info window is shown
            clickedLocation: null,
            clickedPolygon: null,
            clickedIntersection: null,
            marker: null,
            polygonLayer: null,
            intersectionLayer: null,
            editMode: false,
            editingIntersection: null,
        };
        this.drawingView = null;
        this.intersections = [];
    }

    //Functions for calculating ecosystem services
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
            key={polygon.id}
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
        currLineID += 1
        return (
        <Polyline
            path={intersection.getBoundingLine().coordinates}
            key={currLineID} //TODO
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

        buttons = (<div>
            <button type="button" onClick={()=> {this.makeIntersectionEditable(intersection); this.onClose();}}>Edit</button>
            <button type="button" onClick={()=> {this.deleteIntersection(intersection); this.onClose();}}>Delete</button>
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

    render() {
        return (
        <Map
            google={this.props.google}
            ref={(map) => this._map = map}
            zoom={14}
            style={mapStyles}
            initialCenter={{lat: 49.263771, lng: -123.246225}}
            yesIWantToUseGoogleMapApiInternals
            onReady={() => {this.loadPolygonLayer(); this.loadDrawingManager();}}
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
            />
            {this.displayPolygonLayer()}
            {this.displayIntersections()}
        </Map>
        );
    }
}

//Wrapper for map container
export default GoogleApiWrapper({
    apiKey: 'AIzaSyB8xmip8bwBsT_iqZ2-jBei-gwKNm5kR3A',
    libraries: ['drawing', 'geometry']
})(MapContainer);
