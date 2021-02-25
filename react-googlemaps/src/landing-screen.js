import React from 'react';
import ReactDOM from 'react-dom';
import './landing-screen.css';
import { CSSTransitionGroup } from 'react-transition-group';
import TransitionGroup from 'react-transition-group/TransitionGroup';

export default class LandingScreenView extends React.Component {
  constructor(props){
    super(props);
    this.state = {
      visible: true,
    };
  }

  hideLoadingScreen(){
    this.setState({visible: false});
  }

  render() {
    return (
      <div>
        <CSSTransitionGroup
          transitionName="launch-screen"
          transitionLeaveTimeout={1200}>
          {this.state.visible &&
          <div className="landing-screen">
            <h1 id="title">Welcome to the UBC Vancouver Campus Tree Inventory</h1>
            <h2 id="instructions">Press the button below to explore the map</h2>
            <button
              className="menu-button"
              id="launch"
              type="button"
              onClick={() => this.hideLoadingScreen()}
            >
            Launch Map
            </button>
          </div> }
        </CSSTransitionGroup>
      </div>
    );
  }
}
