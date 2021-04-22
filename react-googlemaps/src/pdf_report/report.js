import React from 'react';
import '../App.css';
import { Document, Page, Text, View, StyleSheet, BlobProvider, Canvas } from "@react-pdf/renderer";
import { PolygonEditor } from '../polygons/polygon-editor';
import { ReportGeometry } from './report-geometry';
import ReactDOM from 'react-dom';
import * as turf from '@turf/turf';
import  {getCarbonSequesteredAnnually, getAvoidedRunoffAnnually } from '../constants';

//The margins of each page in the report
const TOP_MARGIN = 50;
const BOTTOM_MARGIN = 50;
const LEFT_MARGIN = 50;
const RIGHT_MARGIN = 50;

//The maximum number of polygons within the intersection that can be included in a report.
//If the number of polygons is greater than this number, a breakdown section will not 
// be included in the report.
const POLYGON_LIMIT = 150;

/**
 * A PDF report containing information about a bounding line and the tree cover within it.
 */
export class IntersectionReport {
  constructor(props, boundingLine, intersectingPolygons, carbonRate, runoffRate, layerName) {
    this.props = props;
    this.boundingLine = boundingLine;
    this.intersectingPolygons = intersectingPolygons;
    this.carbonRate = carbonRate;
    this.runoffRate = runoffRate;
    this.layerName = layerName;
    this.styles = this.createStyleSheet();
  }

  /**
   * Displays a button to generate a report in the info window.
   * @returns A button that can be clicked to generate a report.
   */
  displayReportButton() {
    return (
      <button
        className="info-window-button"
        type="button"
        onClick={() => {
          let button = this.createReport();
          ReactDOM.render(React.Children.only(button), document.getElementById("iwc"));
        }}
      >
        Generate Report
      </button>
    );
  }

  /**
   * Creates a report with information about a bounding line and the tree cover within it.
   * @returns A button which can be clicked to view the generated report in a new tab.
   */
  createReport() {
    const report = (
      <Document>
        <Page size="A4" style={this.styles.page}>
          {this.createTitleSection()}
          {this.createSummarySection()}
        </Page>
        <Page size="A4" style={this.styles.page}>
          {this.createBreakdownSection()}
        </Page>
        <Page size="A4" style={this.styles.page}>
          {this.createLineDetailsSection()}
        </Page>
      </Document>
    );

    return (
      <div>
        <div>
          <BlobProvider document={report}>
            {({ blob, url, loading, error }) => {
              return (
                <a className="button"
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <button className="info-window-button" type="button">
                    {loading ? "Loading..." : "View Report"}
                  </button>
                </a>
              );
            }}
          </BlobProvider>
        </div>
      </div>
    );
  }

  /**
   * Creates a title for the report
   */
  createTitleSection() {
    let date = new Date();
    return (
      <View style={this.styles.title}>
        <Text style={this.styles.titleText}>Ecosystem Services Report</Text>
        <Text style={this.styles.bodyText}>{"Created by TREESAP on " + date}</Text>
      </View>
    );
  }

  /**
   * Creates a line containing the name of the bounding line, if it exists
   */
  createNameLine() {
    if (this.boundingLine.name != undefined) {
      return this.createStatRow("Name", this.boundingLine.name);
    }
  }

  /**
   * Creates a row on the report containing a stat
   * @param {*} statText A description of the stat
   * @param {*} statValue The value of the stat
   */
  createStatRow(statText, statValue) {
    return (
      <View style={this.styles.summaryRow}>
        <View style={this.styles.summaryLeft}>
          <Text style={this.styles.bodyText}>{statText + ": "}</Text>
        </View>
        <View style={this.styles.summaryRight}>
          <Text style={this.styles.bodyText}>{statValue}</Text>
        </View>
      </View>
    );
  }

  /**
   * Creates a stat row that does not take the entire width of the page
   * @param {*} statText A description of the stat
   * @param {*} statValue The value of the stat
   */
  createStatSubRow(statText, statValue) {
    return (
      <View style={this.styles.subBreakdownRow}>
        <View style={this.styles.subBreakdownLeft}>
          <Text style={this.styles.bodyText}>{statText + ": "}</Text>
        </View>
        <View style={this.styles.subBreakdownRight}>
          <Text style={this.styles.bodyText}>{statValue}</Text>
        </View>
      </View>
    );
  }

  /**
   * Creates the section summarizing the area.
   */
  createSummarySection() {
    let boundingArea = PolygonEditor.calculatePolygonArea([this.boundingLine.coordinates]);
    let treeArea = PolygonEditor.getTotalArea(this.intersectingPolygons);
    let totalCarbon = getCarbonSequesteredAnnually(treeArea, this.carbonRate);
    let totalRunoff = getAvoidedRunoffAnnually(treeArea, this.runoffRate);
    let numPolygons = this.intersectingPolygons.length;
    let geometry = new ReportGeometry();
    let vegetationDensity = (treeArea / boundingArea * 100).toFixed(2);
    let centroid = turf.centroid(turf.polygon(PolygonEditor.JSONToGeoJSONCoords([this.boundingLine.coordinates])));

    return (
      <View>
        <View>
          <Text style={this.styles.subtitleText}>Summary</Text>
        </View>
        <View>
          {this.createNameLine()}
          {this.createStatRow("Tree cover layer", this.layerName)}
          {this.createStatRow("Area", boundingArea + " square metres")}
          {this.createStatRow("Total area of tree clusters", treeArea + " square metres")}
          {this.createStatRow("Vegetation density", vegetationDensity + "%")}
          {this.createStatRow("Total carbon sequestered", totalCarbon + " tonnes/year")}
          {this.createStatRow("Total avoided stormwater runoff", totalRunoff + " litres/year")}
          {this.createStatRow("Number of tree clusters within bounds", numPolygons)}
          {this.createStatRow("Center point of area", "(lng: " + centroid.geometry.coordinates[0] + ", lat: " + centroid.geometry.coordinates[1] + ")")}
        </View>
        <View style={this.styles.canvasContainer}>
          <Canvas
            style={this.styles.canvas}
            paint={painter =>
              geometry.drawPolygons(
                painter,
                this.boundingLine.coordinates,
                this.intersectingPolygons,
                {"x": 0, "y":0},
                this.styles.canvas.height,
                this.styles.canvas.width
              )
            }
          >
          </Canvas>
        </View>
      </View>
    );
  }

  /**
   * Creates a section with details about the bounding line
   */
  createLineDetailsSection() {
    let coordinateList = "";
    for (var i in this.boundingLine.coordinates) {
      let point = this.boundingLine.coordinates[i];
      coordinateList += "(lng: " + point.lng + ", lat: " + point.lat + ")\n";
    }

    return (
      <View>
        <Text style={this.styles.subtitleText}>List of Coordinates in Bounds</Text>
        <Text style={this.styles.bodyText}>{coordinateList}</Text>
      </View>
    );
  }

  /**
   * Creates a section with a breakdown of each tree cover polygon within the bounds
   * if the total number is less than or equal to the POLYGON_LIMIT
   */
  createBreakdownSection() {
    const withinPolygonLimit = (this.intersectingPolygons.length <= POLYGON_LIMIT);
    let subsections = [];

    if (withinPolygonLimit) {
      for (let i in this.intersectingPolygons) {
        subsections.push(this.createSinglePolygonSection(this.intersectingPolygons[i], parseInt(i) + 1));
      }
    } else {
      const message = (
        <View>
          <Text style={this.styles.bodyText}>There are too many contained tree clusters to display a breakdown.</Text>
        </View>
      );
      subsections.push(message);
    }

    return (
      <View>
        <Text style={this.styles.subtitleText}>Breakdown of Contained Tree Clusters</Text>
        <View>{subsections}</View>
      </View>
    );
  }

  /**
   * Creates one subsection of the breakdown section.
   * @param {*} polygon The polygon to describe
   * @param {*} num The index of the polygon within the list of all polygons,
   * used by the polygon drawing tool to highlight that polygon
   */
  createSinglePolygonSection(polygon, num) {
    let area = polygon.area;
    let carbon = getCarbonSequesteredAnnually(area, this.carbonRate);
    let runoff = getAvoidedRunoffAnnually(area, this.runoffRate);
    let geometry = new ReportGeometry();

    return (
      <View style={this.styles.breakdownRow}>
        <View style={this.styles.breakdownLeft} wrap={false}>
          {this.createStatSubRow(num + ". Area", area + " square metres")}
          {this.createStatSubRow("Carbon sequestration", carbon + " tonnes/year")}
          {this.createStatSubRow("Avoided stormwater runoff", runoff + " litres/year")}
        </View>
        <View style={this.styles.breakdownRight}>
          <Canvas
            style={this.styles.smallCanvas}
            paint={painter =>
              geometry.drawPolygons(
                painter,
                this.boundingLine.coordinates,
                this.intersectingPolygons,
                {"x": 0, "y":0},
                this.styles.smallCanvas.height,
                this.styles.smallCanvas.width,
                num
              )
            }
          >
          </Canvas>
        </View>
      </View>
    );
  }

  /**
   * Creates a list of the styles used in the report
   */
  createStyleSheet() {
    return (StyleSheet.create({
      title: {
        paddingBottom: 10,
      },
      titleText: {
        fontSize: 20,
        textAlign: "center",
        paddingBottom: 10,
      },
      subtitleText: {
        fontSize: 18,
        textAlign: "left",
        paddingBottom: 20,
      },
      bodyText: {
        fontSize: 11,
        textAlign: "left",
        lineHeight: 1.5,
      },
      page: {
        paddingTop: TOP_MARGIN,
        paddingBottom: BOTTOM_MARGIN,
        paddingLeft: LEFT_MARGIN,
        paddingRight: RIGHT_MARGIN
      },
      canvasContainer: {
        paddingTop: 20,
        paddingLeft: 100,
      },
      canvas: {
        height: 300,
        width: 300,
      },
      smallCanvas: {
        height: 100,
        width: 100,
      },
      summaryRow: {
        flex: 1,
        flexDirection: 'row',
        flexGrow: 1,
      },
      summaryLeft: {
        width: '40%'
      },
      summaryRight: {
        textAlign: "center",
        width: '60%'
      },
      breakdownRow: {
        flex: 1,
        flexDirection: 'row',
        paddingBottom: 20,
      },
      breakdownLeft: {
        width: '50%'
      },
      breakdownRight: {
        width: '50%'
      },
      subBreakdownRow: {
        flex: 1,
        flexDirection: 'row',
      },
      subBreakdownLeft: {
        width: '50%'
      },
      subBreakdownRight: {
        width: '50%'
      },
    }));
  }
}
