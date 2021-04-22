import { PolygonEditor } from "../polygons/polygon-editor";

/**
 * Represents a list of items as a checklist in the settings menu.
 */
export class SettingsList {
  constructor(geojsonList, parseFunction, functionOnCheck, functionOnUncheck) {
    this.items = parseFunction(geojsonList);
    this.loaded = (geojsonList.features != null);
    this.functionOnCheck = functionOnCheck;
    this.functionOnUncheck = functionOnUncheck;
    this.parseFunction = parseFunction;
  }

  /**
   * Get the list as a set of checkboxes
   * @returns A set of checkboxes to render
   */
  getCheckboxes() {
    return this.renderListAsCheckboxes();
  }

  /**
   * Load the list for the first time by parsing the 
   * input list and marking the list as loaded. Only runs once.
   * @param {*} geojsonList A list of features to parse into a list.
   */
  loadSettingsList(geojsonList) {
    if (!this.loaded) {
      this.items = this.parseFunction(geojsonList);
      this.loaded = (geojsonList.features != null);
    }
  }

  /**
   * Parsing function for predefined areas of interest
   * @param {*} featureCollection A feature collection containing areas of interest
   * @returns The list of items parsed from the feature collection
   */
  static parseAreasOfInterest(featureCollection) {
    let items = new Map();

    for (let i in featureCollection.features) {
      let feature = featureCollection.features[i];

      //Right now, we only support Polygons for areas of interest. This could be easily
      // extended to also support Polylines, and potentially extended to support
      // Multipolygons.
      if (feature.geometry.type != "Polygon") {
        continue;
      }

      let coords = PolygonEditor.geoJSONToJSONLine(feature.geometry.coordinates[0]);
      items.set(feature.properties.NAME,
        {
          "polygon": coords,
          "isChecked": false,
        }
      );
    }
    return items;
  }

  /**
   * Parsing function for the list of polygon layers
   * @param {*} polygonList A list of polygon layers
   * @param {*} displayList A list of which layers are currently displayed
   * @returns The list of items parsed from the input list, with any items also
   * on the displayList marked as checked.
   */
  static parsePolygonList(polygonList, displayList) {
    let items = new Map();

    for (let i in polygonList) {
      items.set(polygonList[i],
        {
          "isChecked": displayList.includes(polygonList[i])
        }
      );
    }
    return items;
  }

  /**
   * Convert the list of items into a checklist.
   * @returns A list of checkboxes.
   */
  renderListAsCheckboxes() {
    let checkboxes = [];

    for(let key of this.items.keys()) {
      checkboxes.push(SettingsList.createCheckbox(key, this.items.get(key).isChecked));
    }
    return checkboxes;
  }

  /**
   * For each item on the list that has been checked/unchecked,
   * run functionOnCheck/functionOnUncheck
   */
  updateCheckedWithAction() {
    for (let key of this.items.keys()) {
      let checkbox = document.getElementById(key);
      if (checkbox.checked && !this.items.get(key).isChecked) {
        this.items.get(key).isChecked = true;
        this.functionOnCheck(key, this.items.get(key).polygon);
      } else if (!checkbox.checked && this.items.get(key).isChecked) {
        this.items.get(key).isChecked = false;
        this.functionOnUncheck(key);
      }
    }
  }

  /**
   * Run a function based on all boxes currently checked
   * @param {*} functionOnChecked The function to run
   */
  updateCheckedCumulativeAction(functionOnChecked) {
    let allChecked = [];

    for (let key of this.items.keys()) {
      let checkbox = document.getElementById(key);

      if (checkbox.checked) {
        this.items.get(key).isChecked = true;
        allChecked.push(key);
      } else {
        this.items.get(key).isChecked = false;
      }
    }
    functionOnChecked(allChecked);
  }

  /**
   * Create a checkbox that can be rendered
   * @param {*} key The description to go beside the checkbox
   * @param {*} isChecked Whether the box is currently checked
   * @returns A checkbox with description key that is checked/unchecked based on isChecked
   */
  static createCheckbox(key, isChecked) {
    return (
      <div>
        <input className="check" type="checkbox" id={key} name={key} value={key} defaultChecked={isChecked}/>
        <label for={key}>{key}</label>
      </div>
    );
  }
}
