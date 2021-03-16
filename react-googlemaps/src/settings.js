import React from 'react';
import ReactDOM from 'react-dom';
import './settings.css';
import LandingScreenView from './landing-screen.js';
import { CSSTransitionGroup } from 'react-transition-group';

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

function SettingsDisplay(props) {
  return (
    <div key={'settings'} className="settings">
    <h1>UBC Vancouver Tree Inventory Settings</h1>
      <div className="display">
        <label className="dropdown" for="tree-polys">Choose which year to display:</label>
        <select className="dropdown" name="tree-polys" id="tree-polys">
          <option value="2015LiDAR">2015 LiDAR</option>
          <option value="2018LiDAR">2018 LiDAR</option>
          <option value="2015Photo">2015 Orthophoto</option>
          <option value="2016Photo">2016 Orthophoto</option>
          <option value="2017Photo">2017 Orthophoto</option>
          <option value="2018Photo">2018 Orthophoto</option>
          <option value="2019Photo">2019 Orthophoto</option>
        </select>
        <button className="display-save" type="button">Save and Update Map</button>
      </div>
      <div className="dropdown">
        <label className="input" for="setting1">Change tonnes of C per meter squared here. Current value: {props.setting1} t/m<sup>2</sup> of C</label>
        <br/>
        <input type="text" id="setting1" name="setting1"/>
        <br/>
        <input type="submit" value="Submit"/>
        <br/>
        <label className="input" for="setting2">Change litres of avoided runoff per meter squared here. Current value: {props.setting2} L/m<sup>2</sup></label>
        <br/>
        <input type="text" id="setting2" name="setting2"/>
        <br/>
        <input type="submit" value="Submit"/>
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
      editMode: false
    };
  }

  openMenu(){
    let menu = SettingsDisplay({
      onClick: () => this.closeMenu(), 
      setting1: 10.0, 
      setting2: 12.8, 
      onToggleMode: (editMode) => this.onToggleMode(editMode), 
      editMode:this.state.editMode
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
          { this.state.visible &&
            this.renderButton()}
        </div>
      </div>
    );
  }
}
