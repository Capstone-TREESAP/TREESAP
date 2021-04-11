import { render, screen } from '@testing-library/react';
import App from './App';
import { shallow, mount } from "enzyme";
import toJson from "enzyme-to-json";

it("renders without crashing", () => {
  shallow(<App />);
});

//it("renders Landing Page", () => {
//  const wrapper = shallow(<App />);
//  const welcome = <h1 id="title">Welcome to the UBC Tree Ecosystem Services Analysis Platform</h1>;
//  //expect(wrapper.contains(welcome)).toEqual(true);
//});

it("renders correctly", () => {
  const tree = shallow(<App />);
  expect(toJson(tree)).toMatchSnapshot();
});