import { render, screen } from '@testing-library/react';
import App from './App';
import {MapContainer} from './App';
import { shallow, mount } from "enzyme";
import toJson from "enzyme-to-json";
import {unmountComponentAtNode} from "react-dom";
import Settings from './settings/settings'; 
import SettingsListS, { SettingsList } from './settings/settings-list'; 
import {act} from 'react-dom/test-utils'

/*
 * This is a regression test suite that does some verification that the app can render without crashing, that initial UI components render with the
 * expected state, that data can be fetched from the database within 10 seconds, and that the settings view can parse sample data successfully.
 * 
 * Before running this test suite, search for the tag ##TEST-TAG## in the source code, and uncomment any lines containing this tag.
 */

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
};

var mock_datasets = [
  "LiDAR 2018", 
  "Orthophoto 2014", 
  "Orthophoto 2015", 
  "Orthophoto 2016", 
  "Orthophoto 2017", 
  "Orthophoto 2018", 
  "Orthophoto 2019", 
  "Orthophoto 2020"
];

var mock_default_display = ["LiDAR 2018"];

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

it("renders correctly (regression test)", () => {
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
  expect(Object.keys(database['Tree Cover Polygon Datasets'])).toEqual(mock_datasets);
})

it("Settings view parses and renders Area of Interest and Tree Cover dataset names successfully", async () => {
  var settings = new Settings(
    {
      carbonRate: 2.58,
      runoffRate: 1.637,
      neighborhoodPolygonsList: mock_areas,
      polyList: mock_datasets,
      displayList: mock_default_display,
      onAddAreaOfInterest: () => {},
      onRemoveAreaOfInterest: () => {}
    }
  );
  await sleep(5000);
  // verify settings view parsed props as expected
  expect(settings.props.carbonRate).toEqual(2.58)
  expect(settings.props.runoffRate).toEqual(1.637)
  expect(settings.props.neighborhoodPolygonsList.features).toEqual(mock_areas.features)
  expect(settings.props.displayList).toEqual(mock_default_display)
  expect(settings.props.polyList).toEqual(mock_datasets)
  
})