import { PolygonEditor } from "../polygons/polygon-editor";

export class SettingsList {
  constructor(geojsonList, parseFunction, functionOnCheck, functionOnUncheck) {
    this.items = parseFunction(geojsonList);
    this.loaded = (geojsonList.features != null);
    this.functionOnCheck = functionOnCheck;
    this.functionOnUncheck = functionOnUncheck;
    this.parseFunction = parseFunction;
  }

  getCheckboxes() {
    return this.renderListAsCheckboxes();
  }

  loadSettingsList(geojsonList) {
    if (!this.loaded) {
      this.items = this.parseFunction(geojsonList);
      this.loaded = (geojsonList.features != null);
    }
  }

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

  renderListAsCheckboxes() {
    let checkboxes = [];

    for(let key of this.items.keys()) {
      checkboxes.push(SettingsList.createCheckbox(key, this.items.get(key).isChecked));
    }
    return checkboxes;
  }

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

  static createCheckbox(key, isChecked) {
    return (
      <div>
        <input className="check" type="checkbox" id={key} name={key} value={key} defaultChecked={isChecked}/>
        <label for={key}>{key}</label>
      </div>
    );
  }
}
