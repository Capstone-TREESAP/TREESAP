import React from 'react';
import './settings.css';
import LandingScreenView from './landing-screen.js';
import { CSSTransitionGroup } from 'react-transition-group';
import { SettingsList } from './settings-list';

let constants = new Map()
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
            polyList={this.props.polyList}
            setPolygonLayer={this.props.setPolygonLayer}
            displayList={this.props.displayList}
            onUpdateCarbon={this.props.onUpdateCarbon}
            onUpdateRunoff={this.props.onUpdateRunoff}
            carbonRate={this.props.carbonRate}
            runoffRate={this.props.runoffRate}
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
  constants.set('carbon', setting.value);
  props.onUpdateCarbon(setting.value);
  setting.value = "";
}

function SaveStormwaterValue(props) {
  var setting = document.getElementById('setting2')
  constants.set('runoff', setting.value);
  props.onUpdateRunoff(setting.value);
  setting.value = "";
}

function SettingsDisplay(props) {
  return (
    <div key={'settings'} className="settings">
    <h1>UBC Vancouver Tree Inventory Settings</h1>
      <div className="display">
        {props.polygonLayers.getCheckboxes()}
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
      <div>
        {props.areasOfInterest.getCheckboxes()}
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
      <div className="display-no-columns">
        <p>Select Mode</p>
        {props.displayList.length > 1 && <p>(Edit mode not supported when viewing multiple years of data)</p>}
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
          Change litres of avoided runoff per meter squared per year here. Current value: {constants.get('runoff')} L/m<sup>2</sup>
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
            SaveStormwaterValue(props);
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
    constants.set('carbon', this.props.carbonRate);
    constants.set('runoff', this.props.runoffRate);

    this.areasOfInterest = new SettingsList(this.props.neighborhoodPolygonsList,
      SettingsList.parseAreasOfInterest,
      this.props.onAddAreaOfInterest,
      this.props.onRemoveAreaOfInterest)
    this.polygonLayers = new SettingsList(this.props.polyList,
      () => SettingsList.parsePolygonList(this.props.polyList, this.props.displayList))
  }

  openMenu(){
    let menu = SettingsDisplay({
      onClick: () => this.closeMenu(),
      onToggleMode: (editMode) => this.onToggleMode(editMode),
      editMode:this.state.editMode,
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
