import React, { Component } from 'react';
import ReactDOM from 'react-dom';
import { Map, GoogleApiWrapper, Polygon, Marker, InfoWindow, Polyline } from 'google-maps-react';
import SettingsView from './settings/settings';
import { DrawingView } from './polygons/drawing';
import { PolygonIntersection } from './polygons/polygon-intersection';
import { PolygonEditor } from './polygons/polygon-editor';
import './App.css';
import { IntersectionReport } from './pdf_report/report';
import { Database } from './database';
import { getCarbonSequesteredAnnually, getAvoidedRunoffAnnually } from './constants';
import { ShadingView } from './shading-view';

const GOOGLE_MAPS_API_KEY = 'AIzaSyB8xmip8bwBsT_iqZ2-jBei-gwKNm5kR3A';

//Where to fetch data from for the database
const data_url = "https://raw.githubusercontent.com/Capstone-TREESAP/TREESAP-Database/main/db.json";

//Default map information
const default_centre_coords = {
  lat: 49.26307,
  lng: -123.246655
};
const mapStyles = {
  width: '100%',
  height: '100%',
};

//Colors used to display polygon layers
const colours = [
  "#1C55FF", //dark blue
  "#5CBF9B", //lime green
  "#D9CA00", //yellow
  "#E03FCE", //pink
  "#acb58a", //light green
  "#00A6E8", //teal
  "#E68E00", //orange
  "#6530E3", //purple
  "#014421", //dark green
];

/**
 * Container for the base map and everything displayed on it.
 */
export class MapContainer extends Component {
  constructor(props) {
    super(props);
    this.state = {
      isLoaded: false, //Whether the database has been fetched and loaded
      showInfoWindow: false, //Whether a polygon info window is shown
      clickedLocation: null,
      clickedPolygon: null,
      clickedIntersection: null,
      marker: null,
      intersectionLayer: null,
      editMode: false,
      editingIntersection: null,
      displayList: [],
      database: new Database(),
      carbonRate: 0,
      runoffRate: 0,
      drawingView: null,
      intersections: [],
      shadingView: new ShadingView(),
      shadingMode: false,
      //databaseJSON: null //##TEST-TAG##: uncomment this line to run database fetch test
    };
  }

  componentDidMount() {
    fetch(data_url)
    .then(res => res.json())
    .then(
      (result) => {
        //this.state.databaseJSON = result; //##TEST-TAG##: uncomment this line to run database fetch test
        try {
          this.state.database.parseDatabase(result, this.props)
          .then(() => {
            this.state.displayList.push(this.state.database.polyKeys[0]);
            this.setState({
              carbonRate: this.state.database.carbonRate,
              runoffRate: this.state.database.runoffRate,
              isLoaded: true
            });
            this.renderLegend();
          });
        } catch(e) {
          console.log("Error parsing database:", e);
        }
      },
      (error) => {
        console.log(error);
        this.setState({
          isLoaded: true,
          error
        });
      }
    );
  }

  /**
   * Called when a marker is clicked on. Used to open the info window for that marker
   * @param {*} props unused
   * @param {*} m the marker that was clicked on
   * @param {*} e unused
   */
  onMarkerClick = (props, m, e) => {
    var index = this.state.database.getPolygonSetIndex(this.state.displayList[0]);
    this.state.database.polygonLayers[index].makeCurrentPolygonUneditable();
    this.makeIntersectionUneditable(this.state.editingIntersection);
    this.setState({
      marker: m,
      showInfoWindow: true,
    });
  }

  /**
   * Called when an info window is closed. Closes the info window
   * and removes the marker
   * @param {*} props unused
   */
  onClose = props => {
    if (this.state.showInfoWindow) {
      this.setState({
        showInfoWindow: false,
        marker: null,
      });
    }
  }

  /**
   * Called when a tree cover polygon is clicked on
   * @param {*} polygon The tree cover polygon that has been clicked
   * @param {*} map Unused
   * @param {*} coords The specific coordinates that have been clicked
   */
  handleClick = (polygon, map, coords) => {
    if(this.state.displayList.length != 1) {
      alert("Individual tree cluster information is not available while displaying multiple layers.")
      return;
    }
    //finding the index of the layer that is currently being displayed
    var index = this.state.database.getPolygonSetIndex(this.state.displayList[0]);
    this.state.database.polygonLayers[index].makeCurrentPolygonUneditable();
    let isIntersectionPolygon = (this.state.clickedIntersection != null);
    this.makeIntersectionUneditable(this.state.editingIntersection);

    if (isIntersectionPolygon && !this.state.database.polygonLayers[index].containsPolygon(polygon)) {
      //Treat it as a generic click to avoid displaying information about the wrong polygon
      this.onGenericClick();
      return;
    }

    this.setState({
      clickedLocation: coords,
      clickedIntersection: null,
      intersectionLayer: null,
      clickedPolygon: polygon,
    });
    this.state.database.polygonLayers[index].selectPolygon(this.state.clickedPolygon);
  }

  /**
   * Called when a building is clicked on
   * @param {*} building The building that has been clicked on
   * @param {*} map unused
   * @param {*} coords The specific coordinates that have been clicked on
   */
  handleBuildingClick = (building, map, coords) => {
    this.state.shadingView.handleBuildingClick(building, coords)
    this.setState({
      clickedLocation: coords,
    });
  }

  /**
   * Called when a tree cover polygon has been clicked AFTER a building has been clicked
   * in shading mode
   * @param {*} polygon The polygon that has been clicked on
   * @param {*} map unused
   * @param {*} coords The specific coordinates that have been clicked on
   */
  handleShadingPolygonClick = (polygon, map, coords) => {
    this.state.shadingView.handleShadingPolygonClick(polygon, coords)
    this.setState({
      clickedLocation: coords,
      clickedIntersection: null,
      intersectionLayer: null,
      clickedPolygon: polygon,
    });
  }

  /**
   * Called when an intersection (area of interest) has been clicked on
   * @param {*} intersection The intersection that has been clicked
   * @param {*} map unused
   * @param {*} coords The specific coordinates that have been clicked
   */
  handleIntersectionClick = (intersection, map, coords) => {
    if (this.state.displayList.length != 1) {
      alert("Information about intersections and areas of interest is not available while displaying multiple layers.");
      return;
    }
    var index = this.state.database.getPolygonSetIndex(this.state.displayList[0]);
    this.state.database.polygonLayers[index].makeCurrentPolygonUneditable();
    this.makeIntersectionUneditable(this.state.editingIntersection);

    this.setState({
      clickedLocation: coords,
      clickedPolygon: null,
      clickedIntersection: intersection,
      intersectionLayer: intersection.findIntersectingPolygons(this.state.database.polygonLayers[index].polygons)
    });
  }

  /**
   * Called when a generic point with nothing on it has been clicked.
   */
  onGenericClick = () => {
    if (this.state.displayList.length != 1) {
      return;
    }
    var index = this.state.database.getPolygonSetIndex(this.state.displayList[0]);
    this.state.database.polygonLayers[index].makeCurrentPolygonUneditable();
    this.makeIntersectionUneditable(this.state.editingIntersection);
    this.state.shadingView.clickOffBuilding()

    this.setState({
      clickedLocation: null,
      clickedPolygon: null,
      clickedIntersection: null,
      intersectionLayer: null,
      showInfoWindow: false,
    });
  }

  /**
   * Called when the mode is toggled from edit mode to intersection mode, or vice versa
   * @param {*} editMode whether edit mode is being entered (if false, intersection mode
   * is being entered)
   */
  onToggleMode = (editMode) => {
    this.state.drawingView.resetDrawingMode();
    this.setState({
      editMode: editMode
    });
  }

  /**
   * Called when a predefined area of interest is selected in the settings menu
   * @param {*} name The name of the area of interest
   * @param {*} coordinates The coordinates describing the area of interest
   */
  onAddAreaOfInterest = (name, coordinates) => {
    let intersection = new PolygonIntersection(this.props, coordinates, this._map.map, true, name);
    this.state.intersections.push(intersection);
    this.setState({
      clickedLocation: null,
      clickedPolygon: null,
      clickedIntersection: null,
      intersectionLayer: null,
    });
  }

  /**
   * Called when a predefined area of interest is unselected in the settings menu
   * @param {*} name The name of the area of interest
   */
  onRemoveAreaOfInterest = (name) => {
    if (this.state.clickedIntersection != null) {
      this.state.clickedIntersection.makeUneditable();
    }
    let index = this.state.intersections.findIndex(element => element.name === name);
    this.state.intersections.splice(index, 1);

    this.setState({
      clickedLocation: null,
      clickedIntersection: null,
      intersectionLayer: null,
    });
  }

  /**
   * Called when the polygon layers to be displayed are changed in the settings menu
   * @param {*} displayList The list of layers that are currently being displayed
   */
  setPolygonLayer = (displayList) => {
    let wasOneLayer = (this.state.displayList.length == 1);
    //making sure any info windows that are currently displayed are removed before changing which layers are displayed
    this.setState({
      clickedLocation: null,
      clickedPolygon: null,
      clickedIntersection: null,
      intersectionLayer: null,
      showInfoWindow: false,
    });
    //finding the index of the layer that is currently being displayed
    if (this.state.displayList.length > 0) {
      var index = this.state.database.getPolygonSetIndex(this.state.displayList[0]);
      this.state.database.polygonLayers[index].makeCurrentPolygonUneditable();
    }
    this.setState({
      displayList: displayList
    });

    //Remove drawing manager if more than one layer is going to be displayed
    if (displayList.length == 1) {
      if (!wasOneLayer) {
        this.loadDrawingManager();
      }
    } else {
      this.state.drawingView.closeDrawingManager();
    }
  }

  /**
   * Called when the carbon value is updated in the settings menu
   * @param {*} carbonValue the new value for carbon sequestration
   */
  onUpdateCarbon = (carbonValue) => {
    this.setState({
      carbonRate: carbonValue,
    })
  }

  /**
   * Called when the runoff value is updated in the settings menu
   * @param {*} runoffValue The new value for avoided runoff
   */
  onUpdateRunoff = (runoffValue) => {
    this.setState({
      runoffRate: runoffValue,
    })
  }

  /**
   * Called when the user choses to enter or exit shading mode in the settings menu
   */
  onToggleShadingMode = () => {
    // if not in shading mode, then toggle was clicked to enter shading mode, so render buildings
    if (!this.state.shadingMode) {
      this.state.shadingView.loadBuildingLayer(this.props, this.state.database.buildings);

      // if in shading mode, then toggle was clicked to exit shading mode, so remove buildings
    } else {
      this.state.shadingView.removeBuildingLayer();
    }

    this.setState({
      shadingMode: !this.state.shadingMode,
      showInfoWindow: false,
    });
  }

  /**
   * Opens the drawing manager and creates a listener for polygons being drawn.
   */
  loadDrawingManager = () => {
    this.state.drawingView = new DrawingView(this.props, this._map.map);
    const scope = this;
    this.state.drawingView.drawingManager.addListener('overlaycomplete', function(polygon){
      scope.addPolygon(polygon);
    });
  }

  /**
   * Display any intersections that are in the current list of intersections
   * @returns The intersections to render
   */
  displayIntersections = () => {
    let features = [];
    for (var i = 0; i < this.state.intersections.length; i++) {
      features.push(this.displayIntersection(this.state.intersections[i], "#CC2828", this.state.displayList.length + 1));
    }

    if (this.state.intersectionLayer != null) {
      features.push(this.displayPolygons(this.state.intersectionLayer, "#CC2828", 1));
    }

    return features;
  }

  /**
   * Displays any polygon layers that are in the current display list
   * @returns The polygons to render
   */
  displayPolygonLayer = () => {
    var layerList = [];
    if (this.state.isLoaded) {
      for (var poly in this.state.displayList) {
        var index = this.state.database.getPolygonSetIndex(this.state.displayList[poly]);
        layerList.push(this.displayPolygons(this.state.database.polygonLayers[index].polygons, colours[index], poly));
      }
      return layerList;
    }
  }

  /**
   * Displays the building layer if it currently exists
   * @returns The building polygons to render
   */
  displayBuildingLayer = () => {
    let buildings = this.state.shadingView.getBuildings();
    if (buildings) {
      return this.displayPolygons(buildings, "#6699CC", 0);
    }
  }

  /**
   * Displays a set of polygons 
   * @param {*} polygons A list of polygons in JSON format
   * @param {*} color The color the polygons should be
   * @param {*} zIndex The zIndex the polygons should have
   * @returns A set of polygons to render
   */
  displayPolygons = (polygons, color, zIndex) => {
    return polygons.map(polygon =>
      <Polygon
        paths={polygon.points}
        key={polygon.key}
        onClick={(t, map, coords) => {
          // if shading mode, then first check if a building has been clicked, and handle accordingly
          if (this.state.shadingMode) {
            if (polygon.type == "building") {
              this.handleBuildingClick(polygon, map, coords.latLng);
              /* if shading mode, and a tree cluster was clicked, check if a building was previously clicked
              if so, we can draw a polyline, plant a marker, offer relative positioning info etc.*/
            } else if (this.state.shadingView.buildingHasBeenClicked()) {
              this.handleShadingPolygonClick(polygon, map, coords.latLng);
              // if shading mode and a tree cluster was clicked without a building first being clicked, just behave as usual
            } else {
              this.handleClick(polygon, map, coords.latLng);
            }
            // if not shading mode, just handle tree polygon click as normal
          } else {
            this.handleClick(polygon, map, coords.latLng);
          }
        }}
        strokeColor={color}
        strokeOpacity={0.7}
        strokeWeight={2}
        fillColor={color}
        fillOpacity={0.65}
        editable={polygon.editable}
        zIndex={zIndex}
      />
    );
  }

  /**
   * Displays a polyline
   * @param {*} intersection The polyline to display in JSON format
   * @param {*} color The color the polyline should be
   * @param {*} zIndex The zIndex the polyline should have
   * @returns A polyline to render
   */
  displayIntersection = (intersection, color, zIndex) => {
    let polyline = intersection.getBoundingLine();
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
    );
  }

  /**
   * Delete a polygon from the current layer
   * @param {*} polygon The polygon to delete. Must be contained in the layer
   */
  deletePolygon(polygon) {
    if (this.state.displayList.length != 1) {
      return;
    }
    var index = this.state.database.getPolygonSetIndex(this.state.displayList[0]);
    this.state.database.polygonLayers[index].deletePolygon(polygon);
    this.setState({
      clickedLocation: null,
      clickedPolygon: null,
    });
  }

  /**
   * Adds a polygon either to the current tree cover layer or to the list of intersections,
   * depending on the current mode. Called automatically when a polygon is drawn using
   * the drawing manager.
   * @param {*} polygon The new polygon
   */
  addPolygon(polygon) {
    if (this.state.displayList.length != 1) {
      this.state.drawingView.resetDrawingMode();
      return;
    }

    var index = this.state.database.getPolygonSetIndex(this.state.displayList[0]);

    if (this.state.editMode) {
      this.state.database.polygonLayers[index].addPolygon(polygon);
      this.setState({
        clickedLocation: null,
        clickedPolygon: null,
        clickedIntersection: null,
        intersectionLayer: null,
      });

    } else {
      let intersection = new PolygonIntersection(this.props, polygon, this._map.map, false);
      this.state.intersections.push(intersection);
      this.setState({
        clickedLocation: intersection.getBoundingLine().coordinates[0],
        clickedPolygon: null,
        clickedIntersection: intersection,
        intersectionLayer: intersection.findIntersectingPolygons(this.state.database.polygonLayers[index].polygons)
      });
    }
    this.state.drawingView.resetDrawingMode();
  }

  /**
   * Delete an intersection from the list of intersections. Only called for custom
   * drawn intersections, not predefined ones.
   * @param {*} intersection The intersection to delete. Must be in the list of intersections
   */
  deleteIntersection(intersection) {
    intersection.makeUneditable();
    let index = this.state.intersections.findIndex(element => element === intersection);
    this.state.intersections.splice(index, 1);

    this.setState({
      clickedLocation: null,
      clickedIntersection: null,
      intersectionLayer: null,
    });
  }

  /**
   * Make an intersection editable
   * @param {*} intersection The intersection to make editable. Must be in the list
   * of intersections
   */
  makeIntersectionEditable(intersection) {
    let index = this.state.intersections.findIndex(element => element === intersection);
    this.state.intersections.splice(index, 1);
    intersection.makeEditable();

    this.setState({
      clickedIntersection: null,
      editingIntersection: intersection,
      intersectionLayer: null,
    });
  }

  /**
   * Make an intersection uneditable and save any changes to it
   * @param {*} intersection The intersection to make uneditable. If a null
   * intersection is provided, takes no action
   */
  makeIntersectionUneditable(intersection) {
    if (intersection != null) {
      intersection.makeUneditable();
      this.state.intersections.push(intersection);
    }

    this.setState({
      editingIntersection: null
    });
  }

  /**
   * Open the info window for a tree cover polygon or building polygon and render the buttons for it
   * @param {*} polygon The polygon that has been clicked on
   */
  onInfoWindowOpen(polygon) {
    var buttons;
    var index = this.state.database.getPolygonSetIndex(this.state.displayList[0]);

    if (this.state.editMode && !this.state.shadingMode) {
      buttons = (
        <div>
          <button className="info-window-button" type="button" onClick={() => {this.state.database.polygonLayers[index].makePolygonEditable(polygon, this._map.map); this.onClose();}}>Edit</button>
          <button className="info-window-button" type="button" onClick={() => {this.deletePolygon(polygon); this.onClose();}}>Delete</button>
        </div>
      );
      ReactDOM.render(React.Children.only(buttons), document.getElementById("iwc"));
    }
  }

  /**
   * Open the info window for an intersection (area of interest) and render the buttons for it
   * @param {*} intersection The intersection that has been clicked on
   */
  onIntersectionInfoWindowOpen(intersection) {
    var buttons;
    let index = this.state.database.getPolygonSetIndex(this.state.displayList[0]);
    let polygonLayerName = this.state.database.polyKeys[index];
    let report = new IntersectionReport(this.props, intersection.getBoundingLine(), this.state.intersectionLayer, this.state.carbonRate, this.state.runoffRate, polygonLayerName);

    //Don't offer a delete button if it's predefined. It can be removed using the checklist
    if (intersection.predefined) {
      buttons = (
        <div>
          <button className="info-window-button" type="button" onClick={()=> {this.makeIntersectionEditable(intersection); this.onClose();}}>Edit</button>
          {report.displayReportButton()}
        </div>
      );
    } else {
      buttons = (
        <div>
          <button className="info-window-button" type="button" onClick={()=> {this.makeIntersectionEditable(intersection); this.onClose();}}>Edit</button>
          <button className="info-window-button" type="button" onClick={()=> {this.deleteIntersection(intersection); this.onClose();}}>Delete</button>
          {report.displayReportButton()}
        </div>
      );
    }
    ReactDOM.render(React.Children.only(buttons), document.getElementById("iwc"));
  }

  /**
   * Render the information contained within the info window
   * @returns the information to render
   */
  renderInfoWindow() {
    if (this.state.clickedIntersection != null && this.state.intersectionLayer != null) {
      let totalArea = PolygonEditor.getTotalArea(this.state.intersectionLayer);
      let name = this.state.clickedIntersection.name;
      return (
        <div>
          {name && <h3>Name: {name}</h3>}
          <h3>Total Area of Tree Cover: </h3><p>{totalArea ? totalArea : null} m<sup>2</sup></p>
          <h3>Total Carbon sequestered: </h3><p>{totalArea ? getCarbonSequesteredAnnually(totalArea, this.state.carbonRate) : null} tonnes/year</p>
          <h3>Total Avoided rainwater runoff: </h3><p>{totalArea ? getAvoidedRunoffAnnually(totalArea, this.state.runoffRate) : null} litres/year</p>
        </div>
      );
    } else if (this.state.shadingMode && this.state.shadingView.buildingHasBeenClicked()) {
      if (this.state.shadingView.shadingPolygonHasBeenClicked()) {
        return this.state.shadingView.createShadingPolygonInfoWindow();
      } else {
        return this.state.shadingView.createBuildingInfoWindow();
      }  
    } else {
      var centroid = PolygonEditor.findPolygonCentroid(this.state.clickedPolygon);
      var lat = centroid ? centroid.geometry.coordinates[1].toFixed(8) : null;
      var lng = centroid ? centroid.geometry.coordinates[0].toFixed(8) : null;

      return (
        <div>
          <h3>Area: </h3><p>{this.state.clickedPolygon ? this.state.clickedPolygon.area : null} m<sup>2</sup></p>
          <h3>Carbon sequestered: </h3><p>{this.state.clickedPolygon ? getCarbonSequesteredAnnually(this.state.clickedPolygon.area, this.state.carbonRate) : null} tonnes/year</p>
          <h3>Avoided rainwater runoff: </h3><p>{this.state.clickedPolygon ? getAvoidedRunoffAnnually(this.state.clickedPolygon.area, this.state.runoffRate) : null} litres/year</p>
          <h3>Tree Cluster Centre Coordinates: </h3><p>Latitude: {lat}</p><p>Longitude: {lng}</p>
        </div>
      );
    }
  }

  /**
   * Render the legend of tree cover polygon layers that are currently displayed
   * @returns the legend to render
   */
  renderLegend = () => {
    var legend = [];
    for (var polyLayer in this.state.displayList) {
      legend.push(this.renderListItem(this.state.database.getPolygonSetIndex(this.state.displayList[polyLayer])));
    }
    return legend;
  }

  /**
   * Render one item on the legend
   */
  renderListItem = (item) => {
    return (
      <div className="row">
        <div className="legend" style={{color: "black"}}>
        <p>{this.state.database.polyKeys[item]}</p>
        </div>
        <div className="colour-square" style={{backgroundColor: colours[item], color: colours[item]}}/>
      </div>
    );
  }

  /**
   * Render the entire map and everything on it
   */
  render() {
    return (
      <Map
        google={this.props.google}
        ref={(map) => this._map = map}
        zoom={14}
        style={mapStyles}
        initialCenter={default_centre_coords}
        yesIWantToUseGoogleMapApiInternals
        onReady={() => this.loadDrawingManager()}
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
            neighborhoodPolygonsList={this.state.database.areas_int_polygons}
            onAddAreaOfInterest={this.onAddAreaOfInterest}
            onRemoveAreaOfInterest={this.onRemoveAreaOfInterest}
            polyList={this.state.database.polyKeys}
            displayList={this.state.displayList}
            setPolygonLayer={this.setPolygonLayer}
            onUpdateCarbon={this.onUpdateCarbon}
            onUpdateRunoff={this.onUpdateRunoff}
            carbonRate={this.state.carbonRate}
            runoffRate={this.state.runoffRate}
            onToggleShadingMode={this.onToggleShadingMode}
            ready={this.state.isLoaded}
          />
          {this.state.isLoaded && this.displayPolygonLayer()}
          {this.displayBuildingLayer()}
          {this.displayIntersections()}
          {this.state.shadingView.displayBuildingToPolygonLine()}
          <div className="legend-container">
            <div className="row">
              <h3 id="legend-text">Legend</h3>
          </div>
          {this.state.isLoaded && this.renderLegend()}
        </div>
      </Map>
    );
  }
}

//Wrapper for map container
export default GoogleApiWrapper({
  apiKey: GOOGLE_MAPS_API_KEY,
  libraries: ['drawing', 'geometry', 'visualization']
})(MapContainer);
