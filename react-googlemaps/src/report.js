import React from 'react';
import './App.css';
import { Document, Page, Text, View, StyleSheet, BlobProvider, Font, Canvas, Image } from "@react-pdf/renderer";
import { PolygonEditor } from './polygon-editor';
import { ReportGeometry } from './report-geometry';
import ReactDOM from 'react-dom';

const SQUARE_METRE_TO_HECTARE = 10000;

export class IntersectionReport {
    constructor(boundingLine, intersectingPolygons, carbonRate, runoffRate) {

        this.boundingLine = boundingLine
        this.intersectingPolygons = intersectingPolygons
        this.carbonRate = carbonRate
        this.runoffRate = runoffRate

        this.styles = StyleSheet.create({
            title: {
                marginTop: 30,
                marginLeft: 10,
                marginRight: 10,
                marginBottom: 10,
            },
            titleText: {
                fontSize: 20,
                textAlign: "center",
                paddingBottom: 10,
            },
            subtitleText: {
                fontSize: 18,
                textAlign: "left",
                paddingBottom: 5,
            },
            bodySection: {
                marginLeft: 10,
                marginRight: 10,
                marginTop: 10,
                
                // borderBottomWidth: 1,
                // borderBottomColor: '#112131',
                // borderBottomStyle: 'solid',
            },
            bodyText: {
                fontSize: 11,
                textAlign: "left",
                lineHeight: 1.5,
            },
            page: {
                flexDirection: "row"
            },
            section: {
                flexGrow: 1
            },
            canvasContainer: {
                marginLeft: 10,
                marginRight: 10,
                textAlign: "center",
            },
            canvas: {
                height: 300,
                width: 300,
                align: "inline"
            },
            breakdownRow: {
                flex: 1,
                flexDirection: 'row',
                flexGrow: 1,
            },
            breakdownLeft: {
                marginLeft: 10,
                marginRight: 10,
                width: '50%'
            },
            breakdownRight: {
                marginLeft: 10,
                marginRight: 10,
                textAlign: "center",
                width: '50%'
            },
        });
    }

    getBoundingLineText() {
        return (
            "Bounding polygon:\n" + JSON.stringify(this.boundingLine, null, 2)
        )
    }

    createTitleSection() {
        let date = new Date();
        return (
            <View style={this.styles.title}>
                <Text style={this.styles.titleText}>Ecosystem Services Report</Text>
                <Text style={this.styles.bodyText}>{"Date Created: " + date}</Text>
            </View>
        )
        
    }

    //TODO add details section with coordinates
    createSummarySection() {
        //TODO avoid duplicating code
        //TODO add name
        //TODO add vegetation density
        //TODO add centroid coordinate
        let totalArea = PolygonEditor.getTotalArea(this.intersectingPolygons);
        let totalCarbon = (totalArea / SQUARE_METRE_TO_HECTARE * this.carbonRate).toFixed(2);
        let totalRunoff = (totalArea * this.runoffRate).toFixed(2);
        let numPolygons = this.intersectingPolygons.length;
        let geometry = new ReportGeometry();

        console.log("Creating summary")

        return (
            <View>
            <View style={this.styles.bodySection}>
                <Text style={this.styles.subtitleText}>Summary</Text>
            </View>
            <View style={this.styles.bodySection}>
                <Text style={this.styles.bodyText}>{"Total area of tree clusters: " + totalArea + " square metres"}</Text>
                <Text style={this.styles.bodyText}>{"Total carbon sequestration: " + totalCarbon + " tonnes/year"}</Text>
                <Text style={this.styles.bodyText}>{"Total avoided stormwater runoff: " + totalRunoff + " litres/year"}</Text>
                <Text style={this.styles.bodyText}>{"Number of tree clusters within bounds: " + numPolygons}</Text>
            </View>
            <View style={this.styles.canvasContainer}>
                {/* TODO figure out how to center this */}
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
                    )}
                >
                </Canvas>
            </View>
            </View>
        )
    }

    createBreakdownSection() {
        let subsections = [];
        for (let i in this.intersectingPolygons) {
            subsections.push(this.createSinglePolygonSection(this.intersectingPolygons[i], parseInt(i) + 1))
        }

        return subsections
    }

    createSinglePolygonSection(polygon, num) {
        //TODO avoid duplicating code
        let area = polygon.area
        let carbon = (area / SQUARE_METRE_TO_HECTARE * this.carbonRate).toFixed(2);
        let runoff = (area * this.runoffRate).toFixed(2);
        let geometry = new ReportGeometry();

        return (
            <View style={this.styles.breakdownRow}>
            <View style={this.styles.breakdownLeft}>
                <Text style={this.styles.bodyText}>{num + ". Area:" + area + " square metres"}</Text>
                <Text style={this.styles.bodyText}>{"\tCarbon sequestration: " + carbon + " tonnes/year"}</Text>
                <Text style={this.styles.bodyText}>{"\tAvoided stormwater runoff: " + runoff + " litres/year"}</Text>
            </View>
            <View style={this.styles.breakdownRight}>
                {/* TODO figure out how to center this */}
                <Canvas 
                    style={this.styles.canvas}
                    paint={painter => 
                    geometry.drawPolygon(
                        painter, 
                        polygon.points, 
                        {"x": 0, "y":0},
                        50, 50
                    )}
                >
                </Canvas>
            </View>
            </View>
        )
    }

    displayReportButton() {
        return this.createReport()
    }

    createReport() {
        const MyDocument = (
        <Document>
            <Page size="A4">
                {this.createTitleSection()}
                {this.createSummarySection()}
            </Page>
            {/* <Page size="A4">
                {this.createBreakdownSection()}
            </Page> */}
        </Document>
        );

        console.log("Created document")

        return (
        <div>
            <div>
            <BlobProvider document={MyDocument}>
            {({ blob, url, loading, error }) => {
                return (
                <a className="button" 
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer">
                    <button className="info-window-button" type="button">
                        {loading ? "Loading..." : "View Report"}
                    </button>
                </a>
                )
                
            }}
            </BlobProvider>
            </div>
        </div>)
    }


}