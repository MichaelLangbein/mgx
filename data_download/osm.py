import os
import json
import requests as req
import rasterio.features as riof
import rasterio.transform as riot
import numpy as np

# Tested with http://overpass-turbo.eu/#

def nodeToPoint(node):
    coordinates = [node["lon"], node["lat"]]
    properties = {key: val for key, val in node.items() if key not in ["type", "lon", "lat"]}
    point =  {
        "type": "Feature",
        "geometry" : {
            "type": "Point",
            "coordinates": coordinates,
            },
        "properties" : properties,
    }
    return point

def nodeToPoly(node):
    coordinates = [[[e["lon"], e["lat"]] for e in node["geometry"]]]
    properties = node["tags"] if "tags" in node else {}
    properties["id"] = node["id"]
    return {
        "type": "Feature",
        "geometry" : {
            "type": "Polygon",
            "coordinates": coordinates,
            },
        "properties" : properties,
    }

def osmToGeojson(data, saveFreeNodes=False):
    elements = data["elements"]

    try: 
        ways =  [e for e in elements if e["type"] == "way"]
        polygons = [nodeToPoly(n) for n in ways]
        features = polygons
    except Exception as e:
        print(e)

    if saveFreeNodes:
        nodes = [e for e in elements if e["type"] == "node"]
        freeNodes = []
        for node in nodes:
            isFreeNode = True
            for way in ways:
                if node["id"] in way["nodes"]:
                    isFreeNode = False
                    break
            if isFreeNode:
                freeNodes.append(node) 
        freePoints = [nodeToPoint(n) for n in freeNodes]
        features += freePoints

    json = {
        "type": "FeatureCollection",
        "features": features
    }
    return json

def downloadAndSaveOSM(bbox, saveToDirPath=None, getBuildings=True, getTrees=True, getWater=True):
    overpass_url = "http://overpass-api.de/api/interpreter"

    lonMin = bbox["lonMin"]
    latMin = bbox["latMin"]
    lonMax = bbox["lonMax"]
    latMax = bbox["latMax"]
    stringifiedBbox = f"{latMin},{lonMin},{latMax},{lonMax}"

    buildingQuery = f"""
        [out:json];     /* output in json format */
        way[building]( {stringifiedBbox} );
        (._;>;);        /* get the nodes that make up the ways  */
        out geom;
    """

    treesQuery = f"""
        [out:json];
        (
            way[landuse=forest]( {stringifiedBbox} );
            way[landuse=meadow]( {stringifiedBbox} );
            way[landuse=orchard]( {stringifiedBbox} );
            relation[landuse=forest]( {stringifiedBbox} );  /* also including multi-polyons */
            relation[landuse=meadow]( {stringifiedBbox} );  /* also including multi-polyons */
            relation[landuse=orchard]( {stringifiedBbox} );  /* also including multi-polyons */
        );              /* union of the above statements */
        (._;>;);
        out geom;
    """

    waterQuery = f"""
        [out:json];
        way[natural=water]( {stringifiedBbox} );
        (._;>;);
        out geom;
    """

    fullData = {}

    if saveToDirPath is not None:
        os.makedirs(os.path.join(saveToDirPath, stringifiedBbox), exist_ok=True)

    if getBuildings:
        response = req.get(overpass_url, params={'data': buildingQuery})
        data = response.json()
        geojson = osmToGeojson(data)
        fullData["buildings"] = geojson

        if saveToDirPath is not None:
            filePath = os.path.join(saveToDirPath, stringifiedBbox, 'buildings.geo.json')
            with open(filePath, 'w') as fh:
                json.dump(geojson, fh, indent=4)

    if getTrees:
        response = req.get(overpass_url, params={'data': treesQuery})
        data = response.json()
        geojson = osmToGeojson(data)
        fullData["trees"] = geojson

        if saveToDirPath is not None:
            filePath = os.path.join(saveToDirPath, stringifiedBbox, 'trees.geo.json')
            with open(filePath, 'w') as fh:
                json.dump(geojson, fh, indent=4)

    if getWater:
        response = req.get(overpass_url, params={'data': waterQuery})
        data = response.json()
        geojson = osmToGeojson(data)
        fullData["water"] = geojson

        if saveToDirPath is not None:
            filePath = os.path.join(saveToDirPath, stringifiedBbox, 'water.geo.json')
            with open(filePath, 'w') as fh:
                json.dump(geojson, fh, indent=4)

    return fullData


# osmData = downloadAndSaveOSM(osmDir, bbox)

import rasterio.transform as riot
import rasterio.features as riof


def rasterizeGeojson(geojson, bbox, imgShape):

    if len(geojson["features"]) == 0:
        return np.zeros(imgShape)

    """
    | a  b  c |    | scale  rot  transX |
    | d  e  f | =  | rot   scale transY |
    | 0  0  1 |    |  0      0     1    |

    Transformation 
        from pixel coordinates of source 
        to the coordinate system of the input shapes. 
    See the transform property of dataset objects.
    """

    imgH, imgW = imgShape
    # imgH -= 1
    # imgW -= 1

    lonMin = bbox["lonMin"]
    latMin = bbox["latMin"]
    lonMax = bbox["lonMax"]
    latMax = bbox["latMax"]

    scaleX = (lonMax - lonMin) / imgW
    transX = lonMin
    scaleY = -(latMax - latMin) / imgH
    transY = latMax

    # tMatrix = np.array([
    #     [scaleX, 0, transX],
    #     [0, scaleY, transY],
    #     [0, 0, 1]
    # ])
    # lon_tl, lat_tl, _ = tMatrix @ np.array([0, 0, 1])
    # lon_br, lat_br, _ = tMatrix @ np.array([imgW, imgH, 1])
    # assert(lon_tl == lonMin)
    # assert(lat_tl == latMax)
    # assert(lon_br == lonMax)
    # assert(lat_br == latMin)

    transform = riot.Affine(
        a=scaleX,  b=0,  c=transX,
        d=0,   e=scaleY,  f=transY
    )
    rasterized = riof.rasterize(
        [(f["geometry"], 1) for f in geojson["features"]], 
        (imgH, imgW),
        all_touched=True,
        transform=transform
    )
    return rasterized

