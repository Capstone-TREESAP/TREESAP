const OUTLINE_COLOR = "#575656";
const INTERIOR_COLOR = "#D3D3D3";
const FILL_COLOR = "#014421";

export class ReportGeometry {
  constructor() {

  }

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

  flipPointsUpsideDown(points, topPoint) {
    //Convert so vertical top < bottom
    for (var i in points) {
      points[i].y = topPoint.y + (topPoint.y - points[i].y);
    }
    return points;
  }

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

  getTopPoint(points) {
    let top = points[0];

    for (var i in points) {
      if (points[i].y < top.y) {
        top = points[i];
      }
    }
    return top;
  }

  getBottomPoint(points) {
    let bottom = points[0];

    for (var i in points) {
      if (points[i].y > bottom.y) {
        bottom = points[i];
      }
    }
    return bottom;
  }

  getLeftmostPoint(points) {
    let leftmost = points[0];

    for (var i in points) {
      if (points[i].x < leftmost.x) {
        leftmost = points[i];
      }
    }
    return leftmost;
  }

  getRightmostPoint(points) {
    let rightmost = points[0];

    for (var i in points) {
      if (points[i].x > rightmost.x) {
        rightmost = points[i];
      }
    }
    return rightmost;
  }

  getActualStartingPoint(points, absoluteStart) {
    let leftmostPoint = this.getLeftmostPoint(points);
    let topPoint = this.getTopPoint(points);

    let actualStart = {
      "y": points[0].y - (topPoint.y - absoluteStart.y),
      "x": points[0].x - (leftmostPoint.x  - absoluteStart.x)
    };
    return actualStart;
  }

  getScale(points, height, width) {
    let actualHeight = this.getBottomPoint(points).y - this.getTopPoint(points).y;
    let actualWidth = this.getRightmostPoint(points).x - this.getLeftmostPoint(points).x;

    return Math.min(width/actualWidth, height/actualHeight);
  }
}
