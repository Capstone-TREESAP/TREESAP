import * as turf from '@turf/turf'

export function findIntersections(polygons1, polygons2) {
    var polygonSet1 = polygons1.features;
    var polygonSet2 = polygons2.features;
    var intersections = []
    var area1 = 0;
    var area2 = 0;
    var area_intersection = 0;
    var intersection_issues = null;
    var num_mp = 0;
    console.log("calculating intersections: " + polygons1.name + " and " + polygons2.name);
    for(var i = 0; i < polygonSet1.length; i++) {
        area1 += turf.area(polygonSet1[i]);
    }
    for(var j = 0; j < polygonSet2.length; j++) {
        area2 += turf.area(polygonSet2[j]);
    }
    var error = false;
    for(var i = 0; i < polygonSet1.length && !error; i++) {
        for(var j = 0; j < polygonSet2.length && !error; j++) {
            var intersection = null;
            try
            {
                intersection = turf.intersect(polygonSet1[i], polygonSet2[j]); 
            } catch(e) {
                console.log(e);
                //var difference = turf.difference(polygonSet1[i], polygonSet2[j]);
                //console.log(polygonSet1[i]);
                //console.log(polygonSet2[j]);
                //var split1 = splitPolygon(polygonSet1[i]);
                //var split2 = splitPolygon(polygonSet2[j]);
                //intersection_issues = [];
                //intersection_issues.push(/*split2[0], split2[1], */split1[0], split1[1]);
                //intersection_issues.push(polygonSet2[j]);
                //error = true;
                //polygonSet1.push(split1[0]);
                //polygonSet1.push(split1[1]);
                //polygonSet2.push(split2[0]);
                //polygonSet2.push(split2[1]);
            }
            
            if(intersection && !error) {
                if(intersection.geometry.type == "MultiPolygon") {
                    num_mp++;
                    for(var k = 0; k < intersection.geometry.coordinates.length; k++) {
                        var polygon = {
                            type: "Feature",
                            geometry: {
                              type: "Polygon",
                              coordinates: intersection.geometry.coordinates[k]
                            }
                        }
                        var area = turf.area(polygon);
                        polygon.properties = {area: area}
                        area_intersection += area;
                        intersections.push(polygon);
                    }
                } else {
                    var area = turf.area(intersection);
                    intersection.properties = {area: area}
                    area_intersection += area;
                    intersections.push(intersection);
                }
            }
        } 
    }
    var intersection_set =  {
        type: "FeatureCollection",
        name: polygons1.name + " X " + polygons2.name,
        features: intersection_issues ? intersection_issues : intersections
    }
    
    //var polygons1_similarity = 1.0 - ((area1 - area_intersection) / area_intersection);
    //var polygons2_similarity = 1.0 - ((area2 - area_intersection) / area_intersection);

    var polygons1_similarity = area_intersection / area1;
    var polygons2_similarity = area_intersection / area2;

    console.log("area of " + polygons1.name + ": " + area1);
    console.log("area of " + polygons2.name + ": " + area2);
    console.log("area of intersection: " + area_intersection);
    console.log("similarity of " + polygons1.name + " to intersection: " + polygons1_similarity);
    console.log("similarity of " + polygons2.name + " to intersection: " + polygons2_similarity);
    return intersection_set;
}
