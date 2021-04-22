export class DrawingView {
  constructor(props, map) {
    this.props = props;
    this.map = map;
    this.drawingManager = this.createDrawingManager();
  }

  /**
   * Creates a new drawing manager connected to the map
   * @returns A new google drawing manager.
   */
  createDrawingManager() {
    const {google} = this.props;
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
    drawingManager.setMap(this.map);

    return drawingManager;
  }

  /**
   * Switch from the drawing tool to the select tool.
   */
  resetDrawingMode() {
    this.drawingManager.setOptions({
      drawingMode: null
    });
  }

  /**
   * Allow users to draw.
   */
  openDrawingManager(){
    this.drawingManager.setOptions({
      drawingControl: true
    });
  }

  /**
   * Stop users from drawing.
   */
  closeDrawingManager() {
    this.resetDrawingMode();
    this.drawingManager.setMap(null);
    this.drawingManager = this.createDrawingManager();
    this.drawingManager.setOptions({
      drawingControl: false
    });
    this.resetDrawingMode();
  }
}
