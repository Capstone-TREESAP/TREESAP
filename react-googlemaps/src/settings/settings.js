import React from 'react';
import './settings.css';
import LandingScreenView from '../landing_screen/landing-screen.js';
import { CSSTransitionGroup } from 'react-transition-group';
import { SettingsList } from './settings-list';
let constants = new Map()

export default class SettingsView extends React.Component {
  render() {
    return (
      <div>
        <div>
          <LandingScreenView />
        </div>
        <div className="settings-view">
          <Settings
            onToggleMode={this.props.onToggleMode}
            neighborhoodPolygonsList={this.props.neighborhoodPolygonsList}
            onAddAreaOfInterest={this.props.onAddAreaOfInterest}
            onRemoveAreaOfInterest={this.props.onRemoveAreaOfInterest}
            polyList={this.props.polyList}
            setPolygonLayer={this.props.setPolygonLayer}
            displayList={this.props.displayList}
            onUpdateCarbon={this.props.onUpdateCarbon}
            onUpdateRunoff={this.props.onUpdateRunoff}
            carbonRate={this.props.carbonRate}
            runoffRate={this.props.runoffRate}
            onToggleShadingMode={this.props.onToggleShadingMode}
          />
        </div>
      </div>
    );
  }
}

function MenuButton(props) {
  return (
    <button
      className="menu-button"
      type="button"
      onClick={props.onClick}
    >
      Menu
    </button>
  );
}

function SaveCarbonValue(props) {
  var setting = document.getElementById('setting1');
  if(!isNaN(setting.value) && setting.value !== "" && setting.value.match(/^ *$/) == null) {
    constants.set('carbon', setting.value);
    props.onUpdateCarbon(setting.value);
    setting.value = "";
    document.getElementById('carbon-info-text').innerHTML = "Current value: " + constants.get('carbon') + " tonnes/hectare";
  }
}

function SaveStormwaterValue(props) {
  var setting = document.getElementById('setting2')
  if(!isNaN(setting.value) && setting.value !== "" && setting.value.match(/^ *$/) == null) {
    constants.set('runoff', setting.value);
    props.onUpdateRunoff(setting.value);
    setting.value = "";
    document.getElementById('runoff-info-text').innerHTML = "Current value: " + constants.get('runoff') + " Litres/m<sup>2</sup>";
  }
}

function SettingsDisplay(props) {
  return (
    <div key={'settings'} className="settings">
    <h1 className="settings-text" id="settings-header">UBC Tree Cover Analysis Platform Settings</h1>
    <div className="container1">
      <div className="display">
        <h3 className="settings-text">Select a Data Source:</h3>
        <div className="checkboxes">{props.polygonLayers.getCheckboxes()}</div>
        <br/>
        <button
          className="display-save"
          type="button"
          onClick={() => {
            props.polygonLayers.updateCheckedCumulativeAction(props.setPolygonLayer);
            props.onClick();
          }}
        >
          Save and Update Map
        </button>
      </div>
      <div className="display-no-columns">
        <h3 className="settings-text">Select Mode:</h3>
        {props.displayList.length > 1 && <p className="settings-text">(Edit mode not supported when viewing multiple years of data)</p>}
        {props.displayList.length <= 1 &&
          <input
            className={props.editMode ? "intersection unselected" : "intersection selected"}
            type="button"
            onClick={() => {
              props.onToggleMode(false);
              props.onClick();
            }}
            value="Intersection"
          />
        }
        {props.displayList.length <= 1 &&
          <input
            className={props.editMode ? "edit selected" : "edit unselected"}
            type="button"
            onClick={() => {
              props.onToggleMode(true);
              props.onClick();
            }}
            value="Edit"
          />
        }
      </div>
    </div>
    <div className="container2">
      <div>
        <h3 className="settings-text">Select Key Areas of Interest:</h3>
        <div className="checkboxes">{props.areasOfInterest.getCheckboxes()}</div>
        <br/>
          <button
            className="display-save"
            type="button"
            onClick={() => {
              props.areasOfInterest.updateCheckedWithAction();
              props.onClick();
            }}
          >
            Save and Update Areas of Interest
          </button>
        </div>
    </div>
    <div className="container3">
      
      <div className="dropdown">
        <label
          className="input"
          for="setting1">
        </label>
        <h3 className="settings-text">Change tonnes of carbon per hectare per year here:</h3>
        <input
          type="text"
          id="setting1"
          name="setting1"
        />
        <h3 id="carbon-info-text" className="settings-text">Current value: {constants.get('carbon')} tonnes/hectare</h3>
        <br/>
        <button
          className="display-save"
          type="button"
          onClick={() => {
            SaveCarbonValue(props);
            props.onRefresh();
          }}
        >
          Save
        </button>
        <br/>
        <label
          className="input"
          for="setting2"
        >
        </label>
        <h3 className="settings-text">Change litres of avoided run-off per meter squared per year here:</h3>
        <input
          type="text"
          id="setting2"
          name="setting2"
        />
        <h3 id="runoff-info-text" className="settings-text">Current value: {constants.get('runoff')} Litres/m<sup>2</sup></h3>
        <br/>
        <button
          className="display-save"
          type="button"
          onClick={() => {
            SaveStormwaterValue(props);
            props.onRefresh();
          }}
        >
          Save
        </button>
      </div>
      <div className="display-bottom">
        <h3 className="settings-text">Access Shading and Cooling Tool:</h3>
          <button
            className="display-save"
            type="button"
            onClick={() => {
              props.onToggleShadingMode();
              props.onClick();
            }}
          >
            {props.shadingMode ? "Exit Shading Mode" : "Enter Shading Mode"}
          </button>
        </div>
        
      </div>
      <div className="for-button">
          <button
            className="menu-button"
            type="button"
            onClick={props.onClick}
          >
            Close
          </button>
        </div>
    </div>
    
  )
}

class Settings extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      visible: true,
      menu: null,
      editMode: false,
      shadingMode: false
    };
    constants.set('carbon', this.props.carbonRate);
    constants.set('runoff', this.props.runoffRate);

    this.areasOfInterest = new SettingsList(this.props.neighborhoodPolygonsList,
      SettingsList.parseAreasOfInterest,
      this.props.onAddAreaOfInterest,
      this.props.onRemoveAreaOfInterest);
    this.polygonLayers = new SettingsList(this.props.polyList,
      () => SettingsList.parsePolygonList(this.props.polyList, this.props.displayList))
  }

  openMenu(){
    constants.set('carbon', this.props.carbonRate);
    constants.set('runoff', this.props.runoffRate);
    
    let menu = SettingsDisplay({
      onClick: () => this.closeMenu(),
      onToggleMode: (editMode) => this.onToggleMode(editMode),
      onToggleShadingMode: () => this.onToggleShadingMode(),
      editMode:this.state.editMode,
      shadingMode:this.state.shadingMode,
      onRefresh: () => this.onRefresh(),
      areasOfInterest: this.areasOfInterest,
      polygonLayers: this.polygonLayers,
      displayList: this.props.displayList,
      setPolygonLayer: (displayList) => this.props.setPolygonLayer(displayList),
      onUpdateCarbon: (carbonValue) => this.props.onUpdateCarbon(carbonValue),
      onUpdateRunoff: (runoffValue) => this.props.onUpdateRunoff(runoffValue),
    });

    this.setState({
      visible: false,
      menu: menu
    });
  }

  closeMenu(){
    this.setState({
      visible: true,
      menu: null
    });
  }

  onToggleMode(editMode){
    this.setState({
      editMode: editMode
    })
    this.props.onToggleMode(editMode)
  }

  onToggleShadingMode() {
    this.setState({
      shadingMode: !this.state.shadingMode
    })
    this.props.onToggleShadingMode();
  }
  onRefresh(){
    this.openMenu();
  }

  renderButton(){
    return(
      <MenuButton
        onClick={() => this.openMenu()}
      />
    );
  }

  render() {
    this.areasOfInterest.loadSettingsList(this.props.neighborhoodPolygonsList)
    this.polygonLayers.loadSettingsList(this.props.polyList)

    return (
      <div>
        <CSSTransitionGroup
          transitionName="settings"
          transitionEnterTimeout={500}
          transitionLeaveTimeout={300}>
          {this.state.menu}
        </CSSTransitionGroup>
        <div className="for-button">
          {this.state.visible &&
            this.renderButton()}
        </div>
      </div>
    );
  }
}
