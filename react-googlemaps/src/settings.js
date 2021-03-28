import React from 'react';
import './settings.css';
import LandingScreenView from './landing-screen.js';
import { CSSTransitionGroup } from 'react-transition-group';
import { SettingsList } from './settings-list';

let constants = new Map()
constants.set('stormwater', 0.881)
constants.set('carbon', 30.600)

let polyMap = new Map();
polyMap.set('2014 Orthophoto', 'polygons here');
polyMap.set('2015 Orthophoto', 'polygons here');
polyMap.set('2016 Orthophoto', 'polygons here');
polyMap.set('2017 Orthophoto', 'polygons here');
polyMap.set('2018 Orthophoto', 'polygons here');
polyMap.set('2019 Orthophoto', 'polygons here');
polyMap.set('2020 Orthophoto', 'polygons here');
polyMap.set('2015 LiDAR', 'polygons here');
polyMap.set('2018 LiDAR', 'polygons here');

let itemList = [];

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

function SaveCarbonValue() {
  var setting = document.getElementById('setting1');
  constants.set('carbon', parseFloat(setting.value));
  setting.value = "";
}

function SaveStormwaterValue() {
  var setting = document.getElementById('setting2')
  constants.set('stormwater', parseFloat(setting.value));
  setting.value = "";
}

function renderPolygonList() {
  itemList = [];
  for(let key of polyMap.keys()) {
    itemList.push(buildListItem(key, polyMap));
  }
}

function buildListItem(key, map) {
  return (
    <div>
      <label for={map.get(key)}>{key}</label>
      <input className="check" type="checkbox" id={map.get(key)} name={key.toString()} value={key.toString()}/>
    </div>
  );
}

renderPolygonList();

function updatePolyList(){
  var boxes = document.querySelectorAll(".check")
  var polyToDisplay = [];
  for (let box of boxes) {
    if(box.checked){
      polyToDisplay.push(box.value);
    }
  }
  console.log(polyToDisplay);
}

function SettingsDisplay(props) {
  return (
    <div key={'settings'} className="settings">
    <h1>UBC Vancouver Tree Inventory Settings</h1>
      <div className="display">
        {itemList}
        <button
          className="display-save"
          type="button"
          onClick={() => updatePolyList()}
        >
          Save and Update Map
        </button>
      </div>
      <div>
        {props.areasOfInterest.checkboxes}
        <button
          className="display-save"
          type="button"
          onClick={() => props.areasOfInterest.updateCheckedWithAction()}
        >
          Save and Update Areas of Interest
        </button>
      </div>
      <div className="display-no-columns">
        <p>Select Mode</p>
        <input
          className={props.editMode ? "intersection unselected" : "intersection selected"}
          type="button"
          onClick={() => {
            props.onToggleMode(false);
            props.onClick();
          }}
          value="Intersection"
        />
        <input
          className={props.editMode ? "edit selected" : "edit unselected"}
          type="button"
          onClick={() => {
            props.onToggleMode(true);
            props.onClick();
          }}
          value="Edit"
        />
      </div>
      <div className="dropdown">
        <label
          className="input"
          for="setting1">
          Change tonnes of C per hectare per year here. Current value: {constants.get('carbon')} t/h of C
        </label>
        <br/>
        <input
          type="text"
          id="setting1"
          name="setting1"
        />
        <br/>
        <button
          className="display-save"
          type="button"
          onClick={() => {
            SaveCarbonValue();
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
          Change litres of avoided runoff per meter squared per year here. Current value: {constants.get('stormwater')} L/m<sup>2</sup>
        </label>
        <br/>
        <input
          type="text"
          id="setting2"
          name="setting2"
        />
        <br/>
        <button
          className="display-save"
          type="button"
          onClick={() => {
            SaveStormwaterValue();
            props.onRefresh();
          }}
        >
          Save
        </button>
      </div>
      <div className="display-bottom">
      <p>Access to the Shading and Cooling Ecosystem Services for UBC Vancouver Campus</p>
        <button
          className="display-save"
          type="button"
        >
          Access Shading and Cooling Interface
        </button>
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
    };
    this.areasOfInterest = new SettingsList(this.props.neighborhoodPolygonsList,
      this.props.onAddAreaOfInterest, this.props.onRemoveAreaOfInterest)
  }

  openMenu(){
    let menu = SettingsDisplay({
      onClick: () => this.closeMenu(),
      onToggleMode: (editMode) => this.onToggleMode(editMode),
      editMode:this.state.editMode,
      onRefresh: () => this.onRefresh(),
      areasOfInterest: this.areasOfInterest,
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
    if (!this.areasOfInterest.loaded && this.props.neighborhoodPolygonsList.features != null) {
      this.areasOfInterest.updateItemsList(this.props.neighborhoodPolygonsList)
    }

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
