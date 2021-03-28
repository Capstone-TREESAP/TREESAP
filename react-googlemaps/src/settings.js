import React from 'react';
import ReactDOM from 'react-dom';
import './settings.css';
import LandingScreenView from './landing-screen.js';
import { CSSTransitionGroup } from 'react-transition-group';

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

function renderPolygonList(polyList, displayList) {
  itemList = [];
  for(var key in polyList) {
    itemList.push(buildListItem(polyList[key], displayList.includes(polyList[key])));
  }
  return itemList;
}

function buildListItem(key, checked) {
  return (
    <div className="poly_list">
      <label for={key}>{key}</label>
      { checked && <input className="check" type="checkbox" id={key} name={key.toString()} value={key.toString()} defaultChecked/>}
      { !checked && <input className="check" type="checkbox" id={key} name={key.toString()} value={key.toString()}/> }
    </div>
  );
}

function updatePolyList(props){
  var newPolyList = []
  var boxes = document.querySelectorAll(".check")
  for (let box of boxes) {
    if(box.checked){
      newPolyList.push(box.value);
    }
  }
  props.displayList = newPolyList;
  console.log(props.displayList);
  props.setPolygonLayer(newPolyList);
}

function SettingsDisplay(props) {
  return (
    <div key={'settings'} className="settings">
    <h1>UBC Vancouver Tree Inventory Settings</h1>
      <div className="display">
        {renderPolygonList(props.polyList, props.displayList)}
        <button
          className="display-save"
          type="button"
          onClick={() => {
            updatePolyList(props);
            props.setPolygonLayer(props.displayList);
            props.onClick();
          }}
        >
          Save and Update Map
        </button>
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
      <div className="display">
      <p>Access to the Shading and Cooling Ecosystem Services for UBC Vancouver Campus</p>
        <button
          className="display-save"
          type="button"
        >
          Access Shading and Cooling Interface
        </button>
      </div>
      <div>
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
  }

  openMenu(){
    let menu = SettingsDisplay({
      onClick: () => this.closeMenu(),
      onToggleMode: (editMode) => this.onToggleMode(editMode),
      editMode:this.state.editMode,
      onRefresh: () => this.onRefresh(),
      polyList: this.props.polyList,
      displayList: this.props.displayList,
      setPolygonLayer: (displayList) => this.setPolygonLayer(displayList),
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

  setPolygonLayer(displayList) {
    this.props.setPolygonLayer(displayList)
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
