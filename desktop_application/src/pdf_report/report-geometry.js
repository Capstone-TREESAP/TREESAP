const OUTLINE_COLOR = "#575656";
const INTERIOR_COLOR = "#D3D3D3";
const FILL_COLOR = "#014421";

/**
 * Drawing geometric shapes (ex. polygons) using a painter,
 * which draws on a canvas in a PDF.
 */
export class ReportGeometry {
  constructor() {
  }

  /**
   * Draws a single polygon using the painter, which is already connected to a canvas on which
   * to draw.
   * @param {*} painter The painting tool used to draw
   * @param {*} coordinates The coordinates of the polygon, where the first and last
   *  coordinate must be equal
   * @param {*} startingPoint the offset from the edge of the canvas to start drawing from
   * @param {*} height the max desired height of the polygon. Used to scale the polygon.
   * @param {*} width the max desired width of the polygon. Used to scale the polygon.
   */
  drawPolygon(painter, coordinates, startingPoint, height, width) {
    let points = this.transformPolygon(coordinates, startingPoint, height, width);
    if (points.length == 0) {
      return;
    }

    painter.moveTo(points[0].x, points[0].y);
    for (var i = 1; i < points.length; i++) {
      painter.lineTo(points[i].x, points[i].y);
    }
    painter.stroke();
  }

  /**
   * Draws a set of polygons using the painter, which is already connected to a canvas on which
   * to draw.
   * @param {*} painter The painting tool used to draw
   * @param {*} boundingCoordinates The coordinates of the line which bounds all other polygons.
   * For the polygons to draw correctly, all polygons in polygonList must be contained within this
   * set of bounding coordinates. First and last coordinate must be equal. 
   * @param {*} polygonList A list of polygons within the bounding polygon. For each polygon, the first
   * and last coordinates must be equal.
   * @param {*} startingPoint The offset from the edge of the canvas to start drawing from.
   * @param {*} height The max desired height of the bounding line. Used to scale the polygon.
   * @param {*} width The max desired width of the bounding line. Used to scale the polygon.
   * @param {*} polygonNumToFill [Optional] The index in polygonList of a polygon which should be filled in
   * instead of drawn as an outline. Used to highlight a single polygon. If not included, all polygons will
   * be filled.
   */
  drawPolygons(painter, boundingCoordinates, polygonList, startingPoint, height, width, polygonNumToFill) {
    let transformedPolygons = this.transformPolygonAll(boundingCoordinates, polygonList, startingPoint, height, width);

    for (var i = 0; i < transformedPolygons.length; i++) {
      let points = transformedPolygons[i];
      painter.moveTo(points[0].x, points[0].y);

      for (var j = 1; j < points.length; j++) {
        painter.lineTo(points[j].x, points[j].y);
      }

      if (parseInt(i) === 0) {
        painter.stroke(OUTLINE_COLOR);
      } else if (polygonNumToFill == undefined || polygonNumToFill == null) {
        painter.fillAndStroke(FILL_COLOR, FILL_COLOR);
      } else if (parseInt(i) === polygonNumToFill) {
        painter.fillAndStroke(FILL_COLOR, FILL_COLOR);
      } else {
        painter.stroke(INTERIOR_COLOR);
      }
    }
  }

  /**
   * Transforms an input polygon from a set of lat/lng coordinates to
   * a polygon which can be drawn on a page. This requires offsetting
   * the polygon and scaling it up.
   * @param {*} coordinates The input coordinates in lat/lng format
   * @param {*} startingPoint The desired starting point on the canvas, used to offset the polygon
   * @param {*} height The max desired height of the polygon, used to scale
   * @param {*} width The max desired width of the polygon, used to scale
   * @returns A polygon with the same proportions as the input polygon, but offset to start at
   * startingPoint and scaled to exactly fit within a rectangle of the specified height and width.
   */
  transformPolygon(coordinates, startingPoint, height, width) {
    let points = this.jsonToPagePoints(coordinates);

    //Scale the polygon
    let scale = this.getScale(points, height, width);
    points = this.scalePoints(points, scale);

    //Offset the polygon to the desired starting position
    let offset = this.getActualStartingPoint(points, startingPoint);
    points = this.offsetPoints(points, offset);
    return points;
  }

  /**
   * Transforms a set of polygons, based on the bounding coordinates of all polygons
   * @param {*} boundingCoordinates The coordinates of the line which bounds all other polygons.
   * For the polygons to draw correctly, all polygons in polygonList must be contained within this
   * set of bounding coordinates. First and last coordinate must be equal. In lat/lng format.
   * @param {*} polygonList A list of polygons within the bounding polygon. For each polygon, the first
   * and last coordinates must be equal, and all coordinates must be in lat/lng format.
   * @param {*} startingPoint The desired starting point on the canvas, used to offset the bounding line.
   * @param {*} height The max desired height of the bounding line, used to scale
   * @param {*} width The max desired width of the bounding line, used to scale
   * @returns The bounding line and the list of polygons, each scaled to have the same proportions as the
   * corresponding input. The bounding polygon begins at startingPoint on the canvas and is bounded by 
   * a rectangle with the specified height and width. Each polygon in the list is scaled and offset linearly
   * with the bounding line to approximately recreate how the original polygons would look on a map.
   */
  transformPolygonAll(boundingCoordinates, polygonList, startingPoint, height, width) {
    let transformedPolygons = [];
    let boundingPoints = this.jsonToPagePoints(boundingCoordinates);

    //Scale the polygon
    let scale = this.getScale(boundingPoints, height, width);
    boundingPoints = this.scalePoints(boundingPoints, scale);

    //Offset the polygon to the desired starting position
    let boundingOffset = this.getActualStartingPoint(boundingPoints, startingPoint);
    boundingPoints = this.offsetPoints(boundingPoints, boundingOffset);
    transformedPolygons.push(boundingPoints);

    //For the rest of the polygons, scale and offset based on bounding polygon
    for (var i in polygonList) {
      let polygon = this.jsonToPagePoints(polygonList[i].points[0]); //We don't support drawing inner rings on reports, sorry
      let offset = {
        "x": boundingOffset.x + (polygon[0].x - this.jsonToPagePoints(boundingCoordinates)[0].x) * scale,
        "y": boundingOffset.y + (polygon[0].y - this.jsonToPagePoints(boundingCoordinates)[0].y) * scale
      };

      polygon = this.scalePoints(polygon, scale);
      polygon = this.offsetPoints(polygon, offset);
      transformedPolygons.push(polygon);
    }

    //Flip the points since they start upside down
    let bottomPoint = this.getBottomPoint(boundingPoints);
    transformedPolygons.map(polygon => this.flipPointsUpsideDown(polygon, bottomPoint));

    //Re-offset back upwards after flipping
    let offset = this.getTopPoint(transformedPolygons[0]).y - startingPoint.y;
    for (var i in transformedPolygons) {
      for (var j in transformedPolygons[i]) {
        transformedPolygons[i][j].y -= offset;
      }
    }
    return transformedPolygons;
  }

  /**
   * Converts JSON (lat/lng) points to canvas (x/y) points.
   * @param {*} points The input points, in lat/lng format
   * @returns The same points, where ecah lng is now labelled
   * "x" and each lat is now labelled "y".
   */
  jsonToPagePoints(points) {
    let newPoints = [];

    //Convert format
    for (var i = 0; i < points.length; i++) {
      newPoints[i] = {
        "y": points[i].lat,
        "x": points[i].lng
      };
    }
    return newPoints;
  }

  /**
   * Flip a set of points, mirrored along the topPoint
   * @param {*} points A set of points in x/y format
   * @param {*} topPoint The point used as reference for flipping
   * @returns The line from topPoint's y coordinate to each point's
   * y coordinate is the same magnitude and opposite direction.
   */
  flipPointsUpsideDown(points, topPoint) {
    //Convert so vertical top < bottom
    for (var i in points) {
      points[i].y = topPoint.y + (topPoint.y - points[i].y);
    }
    return points;
  }

  /**
   * Scale points acoording to a scale factor. Scaled in relation
   * to the coordinate at index 0 of the list.
   * @param {*} points The points to scale, in x/y format
   * @param {*} scale The scale factor
   * @returns A set of points scaled proportionally, so that the distance between
   * each point and the point at index 0 is now scale times larger than before.
   */
  scalePoints(points, scale) {
    let newPoints = [];

    for (var i in points) {
      newPoints.push({
        "x": (points[i].x - points[0].x) * scale,
        "y": (points[i].y - points[0].y) * scale
      });
    }
    return newPoints;
  }

  /**
   * Offset a set of points by the offset.
   * @param {*} points A set of points in x/y format
   * @param {*} offset An offset amount in x/y format
   * @returns A set of points where each point has had the
   * offset added to it
   */
  offsetPoints(points, offset) {
    let newPoints = [];

    for (var i in points) {
      newPoints.push({
        "x": offset.x + points[i].x,
        "y": offset.y + points[i].y
      });
    }
    return newPoints;
  }

  /**
   * Find the highest point on the page that this set of
   * points contains.
   * @param {*} points A set of points in x/y format
   * @returns The highest point in the set
   */
  getTopPoint(points) {
    let top = points[0];

    for (var i in points) {
      if (points[i].y < top.y) {
        top = points[i];
      }
    }
    return top;
  }

  /**
   * Finds the lowest point on the page that this set of 
   * points contains.
   * @param {*} points A set of points in x/y format
   * @returns The lowest point in the set
   */
  getBottomPoint(points) {
    let bottom = points[0];

    for (var i in points) {
      if (points[i].y > bottom.y) {
        bottom = points[i];
      }
    }
    return bottom;
  }

  /**
   * Finds the leftmost point on the page that this set of
   * points contains
   * @param {*} points A set of points in x/y format
   * @returns The leftmost point in the set
   */
  getLeftmostPoint(points) {
    let leftmost = points[0];

    for (var i in points) {
      if (points[i].x < leftmost.x) {
        leftmost = points[i];
      }
    }
    return leftmost;
  }

  /**
   * Finds the rightmost point on the page that this set of
   * points contains
   * @param {*} points A set of points in x/y format
   * @returns The rightmost point in the set
   */
  getRightmostPoint(points) {
    let rightmost = points[0];

    for (var i in points) {
      if (points[i].x > rightmost.x) {
        rightmost = points[i];
      }
    }
    return rightmost;
  }

  /**
   * Given a desired starting location for the top left corner of a polygon,
   * find the desired coordinates of the first point in the set.
   * This is necessary because the first point may not be the top or leftmost
   * point.
   * @param {*} points A set of points in x/y format
   * @param {*} absoluteStart The desired starting location
   * @returns The amount by which points need to be offset so that the polygon
   * is bounded by a rectangle with absoluteStart as its top left point.
   */
  getActualStartingPoint(points, absoluteStart) {
    let leftmostPoint = this.getLeftmostPoint(points);
    let topPoint = this.getTopPoint(points);

    let actualStart = {
      "y": points[0].y - (topPoint.y - absoluteStart.y),
      "x": points[0].x - (leftmostPoint.x  - absoluteStart.x)
    };
    return actualStart;
  }

  /**
   * Get the required scale factor to make a set of polygons bounded
   * exactly by the height and width. The scale factor will be the minimum
   * of the factors required to achieve the desired height and the desired width,
   * to ensure that the polygon fits in both.
   * @param {*} points A set of points in x/y format
   * @param {*} height The max desired height of the polygon
   * @param {*} width The max desired width of the polygon
   * @returns A scale factor
   */
  getScale(points, height, width) {
    let actualHeight = this.getBottomPoint(points).y - this.getTopPoint(points).y;
    let actualWidth = this.getRightmostPoint(points).x - this.getLeftmostPoint(points).x;

    return Math.min(width/actualWidth, height/actualHeight);
  }
}
