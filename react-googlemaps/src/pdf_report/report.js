import React from 'react';
import '../App.css';
import { Document, Page, Text, View, StyleSheet, BlobProvider, Canvas } from "@react-pdf/renderer";
import { PolygonEditor } from '../polygons/polygon-editor';
import { ReportGeometry } from './report-geometry';
import ReactDOM from 'react-dom';
import * as turf from '@turf/turf';
import  {getCarbonSequesteredAnnually, getAvoidedRunoffAnnually } from '../constants';

const TOP_MARGIN = 50;
const BOTTOM_MARGIN = 50;
const LEFT_MARGIN = 50;
const RIGHT_MARGIN = 50;

const POLYGON_LIMIT = 150;

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

  createTitleSection() {
    let date = new Date();
    return (
      <View style={this.styles.title}>
        <Text style={this.styles.titleText}>Ecosystem Services Report</Text>
        <Text style={this.styles.bodyText}>{"Created by TREESAP on " + date}</Text>
      </View>
    );
  }

  createNameLine() {
    if (this.boundingLine.name != undefined) {
      return this.createStatRow("Name", this.boundingLine.name);
    }
  }

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

  createSummarySection() {
    let boundingArea = PolygonEditor.getPolygonArea(this.props, PolygonEditor.jsonToGoogleCoords(this.props, this.boundingLine.coordinates));
    let treeArea = PolygonEditor.getTotalArea(this.intersectingPolygons);
    let totalCarbon = getCarbonSequesteredAnnually(treeArea, this.carbonRate);
    let totalRunoff = getAvoidedRunoffAnnually(treeArea, this.runoffRate);
    let numPolygons = this.intersectingPolygons.length;
    let geometry = new ReportGeometry();
    let vegetationDensity = (treeArea / boundingArea * 100).toFixed(2);
    let centroid = turf.centroid(turf.polygon(PolygonEditor.JSONtoGeoJSONCoords(this.boundingLine.coordinates)));

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
          {this.createStatRow("Center point of area", "(" + centroid.geometry.coordinates[0] + ", " + centroid.geometry.coordinates[1] + ")")}
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

  createLineDetailsSection() {
    let coordinateList = "";
    for (var i in this.boundingLine.coordinates) {
      let point = this.boundingLine.coordinates[i];
      coordinateList += "(" + point.lat + ", " + point.lng + ")\n";
    }

    return (
      <View>
        <Text style={this.styles.subtitleText}>List of Coordinates in Bounds</Text>
        <Text style={this.styles.bodyText}>{coordinateList}</Text>
      </View>
    );
  }

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
