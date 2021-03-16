import React, { Component, useReducer, useState } from 'react';
import ReactDOM from 'react-dom';
import { Map, GoogleApiWrapper, Polygon, Marker, InfoWindow } from 'google-maps-react';
import polygons from './lidar_polygons_with_area.json';
import SettingsView from './settings';
import { DrawingView } from './drawing';
import { PolygonLayer } from './polygon-layer'
import { PolygonEditor } from './polygon-editor';

const CARBON_RATE = 30.600; // tonnes/hectare/year
const SQUARE_METRE_TO_HECTARE = 10000; // m2/hectare
const TREE_RUNOFF_EFFECTS = 0.881 // L/m2/year

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
            marker: null,
            polygon: null,
            polygonLayer: null,
            editMode: false,
        };
        this.drawingView = null;
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

        this.setState({
            clickedLocation: coords,
            showInfoWindow: this.state.showInfoWindow,
            polygon: polygon
        })

        this.state.polygonLayer.selectPolygon(this.state.polygon)
    };

    onGenericClick = () => {
        this.state.polygonLayer.makeCurrentPolygonUneditable();

        this.setState({
            clickedLocation: null,
            polygon: null,
            showInfoWindow: false,
        })
    }

    onToggleMode = (editMode) => {
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
            scope.addPolygon(scope, polygon);
        })
    }

    displayPolygonLayer = () => {
        if (this.state.polygonLayer != null) {
            return this.displayPolygons(this.state.polygonLayer.polygons)
        }
    }

    //Display a set of polygons
    displayPolygons = (polygons) => {
        return polygons.map(polygon => 
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
            editable={polygon.editable}
        />
        );
    }

    deletePolygon(polygon) {
        this.state.polygonLayer.deletePolygon(polygon)
        this.setState({
            clickedLocation: null
        })
    }

    addPolygon(scope, polygon) {
        if (scope.state.editMode) {
            scope.state.polygonLayer.addPolygon(polygon)
            scope.setState({
                polygon: null
            })
        } else {
            const {google} = this.props
            var bounds;
            if (polygon.type == google.maps.drawing.OverlayType.POLYGON) {
                bounds = PolygonEditor.getPointsFromPolygon(polygon);
            } else if (polygon.type == google.maps.drawing.OverlayType.RECTANGLE) {
                bounds = PolygonEditor.getPointsFromRectangle(this.props, polygon);
            }

            //TODO: This is where the code for polygon intersections will be called
            console.log("Polygon for intersection:", PolygonEditor.getPolygonGeoJSON(bounds))
        }
    }

    onInfoWindowOpen(polygon) {
        var buttons;

        if (this.state.editMode) {
            buttons = (<div>
                <button type="button">Report</button>
                <button type="button" onClick={() => {this.state.polygonLayer.makePolygonEditable(polygon); this.onClose();}}>Edit</button>
                <button type="button" onClick={() => {this.deletePolygon(polygon); this.onClose();}}>Remove</button>
            </div>)
        } else {
            buttons = (<div>
                <button type="button">Report</button>
            </div>)
        }

        ReactDOM.render(React.Children.only(buttons), document.getElementById("iwc"))
    }

    render() {
        return (
        <Map
            google={this.props.google}
            ref={(map) => this._map = map}
            zoom={14}
            style={mapStyles}
            initialCenter={{lat: 49.2367, lng: -123.2031}}
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
                onOpen={() => {this.onInfoWindowOpen(this.state.polygon)}}
            >
                <div id="iwc" />
                <div>
                    <h3>Area: {this.state.polygon ? this.state.polygon.area : null} m<sup>2</sup></h3>
                    <h3> Carbon sequestered: {this.state.polygon ? this.getCarbonSequesteredAnnually(this.state.polygon.area).toFixed(2) : null} tonnes/year</h3>
                    <h3> Avoided rainwater run-off: {this.state.polygon ? this.getAvoidedRunoffAnnually(this.state.polygon.area).toFixed(2) : null} litres/year</h3>
                </div>
            </InfoWindow>
            <SettingsView 
                onToggleMode={this.onToggleMode} 
            />
            {this.displayPolygonLayer()}
        </Map>
        );
    }
}

//Wrapper for map container
export default GoogleApiWrapper({
    apiKey: '',
    libraries: ['drawing']
})(MapContainer);
