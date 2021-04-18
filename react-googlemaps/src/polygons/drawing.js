export class DrawingView {
    constructor(props, map) {
        this.props = props
        this.map = map
        this.drawingManager = this.createDrawingManager()
    }

    createDrawingManager() {
        const {google} = this.props
        const drawingManager = new google.maps.drawing.DrawingManager ({
            drawingControl: true,
            drawingControlOptions: {
            position: google.maps.ControlPosition.TOP_CENTER,
            drawingModes: [
                google.maps.drawing.OverlayType.POLYGON,
                google.maps.drawing.OverlayType.RECTANGLE,
            ],
            },
        });
        drawingManager.setMap(this.map)

        return drawingManager
    }

    resetDrawingMode() {
        this.drawingManager.setOptions({
            drawingMode: null
        })
    }

    openDrawingManager(){
        this.drawingManager.setOptions({
            drawingControl: true
        });
    }

    closeDrawingManager() {
        this.resetDrawingMode()
        this.drawingManager.setMap(null)
        this.drawingManager = this.createDrawingManager()
        this.drawingManager.setOptions({
            drawingControl: false
        });
        this.resetDrawingMode()
    }
}
