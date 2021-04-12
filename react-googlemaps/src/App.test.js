import { render, screen } from '@testing-library/react';
import App from './App';
import {MapContainer} from './App';
import { shallow, mount } from "enzyme";
import toJson from "enzyme-to-json";
import {unmountComponentAtNode} from "react-dom";
import SettingsView from './settings/settings'; 
import { Database } from './database';


var database = new Database();

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

var mock_areas = {
  "type": "FeatureCollection",
  "features": [
      {
          "type": "Feature",
          "geometry": {
              "type": "Polygon",
              "coordinates": [[
                  [-123.2599, 49.2672],
                  [-123.2589, 49.2661],
                  [-123.2602, 49.2656],
                  [-123.2599, 49.2672]
              ]]
          },
          "properties": {
              "NAME": "Nitobe Garden"
          }
      },
      {
          "type": "Feature",
          "geometry": {
              "type": "Polygon",
              "coordinates": [[
                  [-123.2566, 49.2691],
                  [-123.2560, 49.2693],
                  [-123.2564, 49.2697],
                  [-123.2569, 49.2695],
                  [-123.2566, 49.2691]
              ]]
          },
          "properties": {
              "NAME": "Rose Garden"
          }
      },
      {
          "type": "Feature",
          "geometry": {
              "type": "Polygon",
              "coordinates": [[
                  [-123.2480, 49.2571],
                  [-123.2468, 49.2576],
                  [-123.2458, 49.2563],
                  [-123.2471, 49.2559],
                  [-123.2480, 49.2571]
              ]]
          },
          "properties": {
              "NAME": "Rhododendron Wood"
          }
      }
  ]
}.toString();
let container = null;
beforeEach(() => {
  // setup a DOM element as a render target
  container = document.createElement("div");
  document.body.appendChild(container);
});

afterEach(() => {
  // cleanup on exiting
  unmountComponentAtNode(container);
  container.remove();
  container = null;
});

it("renders without crashing", () => {
  shallow(<App />);
});

it("renders correctly", () => {
  const tree = shallow(<App />);
  expect(toJson(tree)).toMatchSnapshot();
});

jest.setTimeout(20000);

it("Fetches data from db correctly", async () => {
  var map = new MapContainer();
  map.componentDidMount();
  // wait 10 seconds for fetch to complete
  await sleep(10000);
  var database = map.state.databaseJSON;
  // checking buildings geojson filepath fetched correctly
  expect(database['UBC Buildings']['files'][0]).toEqual('buildings/ubcv_buildings.geojson');
  // checking ubc boundary geojson filepath fetched correctly
  expect(database['UBC Boundary']['files'][0]).toEqual('constants/ubcv_legal_boundary.geojson');
  // checking ubc calculation constants filepath fetched correctly
  expect(database['Calculation Constants']['files'][0]).toEqual('constants/calculation_constants.json');
  // checking areas of interest filepaths fetched correctly
  expect(database['Areas of Interest']['files']).toEqual([
    'areas_of_interest/ubcv_neighbourhoods.geojson',
    'areas_of_interest/gardens.geojson',
    'areas_of_interest/ubc_boundary.geojson'
  ]);
  // checking all expected tree cover datasets present in fetch
  expect(Object.keys(database['Tree Cover Polygon Datasets'])).toEqual([
    'LiDAR 2018',
    'Orthophoto 2014',
    'Orthophoto 2015',
    'Orthophoto 2016',
    'Orthophoto 2017',
    'Orthophoto 2018',
    'Orthophoto 2019',
    'Orthophoto 2020'
  ]);
})

//it("Settings view receives and renders data from app successfully", () => {
//  const tree = shallow(<App />);
//  expect(toJson(tree)).toMatchSnapshot();
//});