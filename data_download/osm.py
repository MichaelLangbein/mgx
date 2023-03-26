import os
import json
import requests as req

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
    properties = node["tags"]
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

    ways =  [e for e in elements if e["type"] == "way"]
    polygons = [nodeToPoly(n) for n in ways]
    features = polygons

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

def downloadAndSaveOSM(saveToDirPath, bbox, getBuildings=True, getTrees=True, getWater=True):
    overpass_url = "http://overpass-api.de/api/interpreter"

    stringifiedBbox = f"{bbox[1]},{bbox[0]},{bbox[3]},{bbox[2]}"

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

    if getBuildings:
        response = req.get(overpass_url, params={'data': buildingQuery})
        data = response.json()
        geojson = osmToGeojson(data)
        filePath = os.path.join(saveToDirPath, 'buildings.geo.json')
        with open(filePath, 'w') as fh:
            json.dump(geojson, fh, indent=4)
        fullData["buildings"] = geojson

    if getTrees:
        response = req.get(overpass_url, params={'data': treesQuery})
        data = response.json()
        geojson = osmToGeojson(data)
        filePath = os.path.join(saveToDirPath, 'trees.geo.json')
        with open(filePath, 'w') as fh:
            json.dump(geojson, fh, indent=4)
        fullData["trees"] = geojson

    if getWater:
        response = req.get(overpass_url, params={'data': waterQuery})
        data = response.json()
        geojson = osmToGeojson(data)
        filePath = os.path.join(saveToDirPath, 'water.geo.json')
        with open(filePath, 'w') as fh:
            json.dump(geojson, fh, indent=4)
        fullData["water"] = geojson

    return fullData


# osmData = downloadAndSaveOSM(osmDir, bbox)
