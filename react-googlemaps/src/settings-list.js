import { PolygonEditor } from "./polygon-editor";

export class SettingsList {
    constructor(geojsonList, parseFunction, functionOnCheck, functionOnUncheck) {
        this.items = parseFunction(geojsonList)
        this.loaded = (geojsonList.features != null)
        this.checkboxes = this.renderListAsCheckboxes()
        this.functionOnCheck = functionOnCheck
        this.functionOnUncheck = functionOnUncheck
        this.parseFunction = parseFunction
    }

    updateItemsList(geojsonList) {
        this.items = this.parseFunction(geojsonList)
        this.checkboxes = this.renderListAsCheckboxes()
        this.loaded = (geojsonList.features != null)
    }

    static parseAreasOfInterest(featureCollection) {
        let items = new Map();
        
        for (let i in featureCollection.features) {
            let feature = featureCollection.features[i]

            //TODO something is wrong with this polygon so just ignore it lol
            if (feature.properties.NAME === "Stadium Road") {
                continue;
            }


            let coords = PolygonEditor.backwardsGeoJSONToJSONCoords(feature.geometry.coordinates[0])
        
            items.set(feature.properties.NAME, 
                {
                    "polygon": coords,
                    "isChecked": false
                }
            )
        }

        return items
    }

    renderListAsCheckboxes() {
        let checkboxes = [];

        for(let key of this.items.keys()) {
            checkboxes.push(SettingsList.createCheckbox(key));
        }

        return checkboxes;
    }

    updateCheckedWithAction() {
        for (let key of this.items.keys()) {
            let checkbox = document.getElementById(key)
            
            if (checkbox.checked && !this.items.get(key).isChecked) {
                this.items.get(key).isChecked = true
                console.log("Checked box", key)
                this.functionOnCheck(key, this.items.get(key).polygon)
            } else if (!checkbox.checked && this.items.get(key).isChecked) {
                this.items.get(key).isChecked = false
                console.log("Unchecked box", key)
                this.functionOnUncheck(key)
            }
        }
    }

    static createCheckbox(key) {
        return (
          <div>
            <input className="check" type="checkbox" id={key} name={key.toString()} value={key.toString()}/>
            <label for={key}>{key}</label>
          </div>
        );
    }


}