import React from 'react';
import './landing-screen.css';
import logo from './landing-screen-icon.png'
import { CSSTransitionGroup } from 'react-transition-group';

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
          transitionEnterTimeout={10}
          transitionLeaveTimeout={1200}>
          {this.state.visible &&
          <div className="landing-screen">
            <h1 id="title">Welcome to the UBC Tree Ecosystem Services Analysis Platform</h1>
            <img src={logo} id="logo"/>
            <h2 id="instructions">Press the button below to explore the map</h2>
            {!this.props.ready &&
            <button
              id="loading-button"
              type="button"
            >
            Loading...
            </button>
            }
            <button
              className="menu-button"
              id="launch"
              type="button"
              onClick={() => this.hideLoadingScreen()}
            >
            Launch Map
            </button>
          </div>
          }
        </CSSTransitionGroup>
      </div>
    );
  }
}
