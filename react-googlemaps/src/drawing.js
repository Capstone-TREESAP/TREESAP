import React from 'react';
  
export class DrawingView extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
          visible: false,
          drawingManager: null
        };
    }

    render() {
        this.state.visible = this.props.showDrawingView

        if (this.props.google != undefined && this.props.map != undefined) {
            //Create the drawing manager if it doesn't already exist
            if (this.state.drawingManager == null) {
                this.state.drawingManager = this.createDrawingManager()
            }

            //Choose whether to show the drawing manager
            if (this.state.visible) {
                this.openDrawingManager()
            } else {
                this.closeDrawingManager()
            }
        }
        return null
    }

    createDrawingManager() {
        const {google} = this.props
        const drawingManager = new google.maps.drawing.DrawingManager ({
            // drawingMode: google.maps.drawing.OverlayType.POLYGON,
            drawingControl: true,
            drawingControlOptions: {
            position: google.maps.ControlPosition.TOP_CENTER,
            drawingModes: [
                google.maps.drawing.OverlayType.POLYGON,
                google.maps.drawing.OverlayType.RECTANGLE,
            ],
            },
        });
        drawingManager.setMap(this.props.map)
        return drawingManager
    }
    
    openDrawingManager(){
        this.state.drawingManager.setOptions({
            drawingControl: true
        });
        return this.state.drawingManager
    }

    closeDrawingManager() {
        this.state.drawingManager.setOptions({
            drawingControl: false
        })
        return this.state.drawingManager
    }
}
