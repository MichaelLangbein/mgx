#%%
import os
import json
import csv
import numpy as np
import fiona
from shapely.geometry import shape
import matplotlib.pyplot as plt

from raster import readTif, tifGetPixelSizeDegrees, tifGetBbox
from vectorAndRaster import rasterizePercentage
from analyze import extractClouds, scaleBandData, radiance2BrightnessTemperature, bt2lstSingleWindow

np.seterr(all="ignore")


def readJson(path):
    fh = open(path)
    data = json.load(fh)
    return data

def getMaxPixelSize(path):
    tifFile = readTif(path)
    sizeH, sizeW = tifGetPixelSizeDegrees(tifFile)
    return max( sizeH, sizeW)

def getPixelData(tifPath, bbox):
    tifFile = readTif(tifPath)
    lonMin, latMin, lonMax, latMax = bbox
    return tifGetBbox(tifFile, {"lonMin": lonMin, "latMin": latMin, "lonMax": lonMax, "latMax": latMax})

def pixelizeCoverageFraction(geometries, bbox, shape):
    (lonMin, latMin, lonMax, latMax) = bbox
    dbox = {"lonMin": lonMin, "latMin": latMin, "lonMax": lonMax, "latMax": latMax}
    percentage = rasterizePercentage(geometries, dbox, shape)
    return percentage / 100

def estimateLst(b10, qa, meta, buildingFraction, roadFraction):
    noDataValue = -9999
    vegetationEmissivity = 0.973
    buildingEmissivity   = 0.932  # https://pure.tudelft.nl/ws/files/95823567/1_s2.0_S221209552100167X_main.pdf
    roadEmissivity       = 0.945

    b10NoClouds = extractClouds(b10, qa, noDataValue)
    toaRadiance = scaleBandData(b10NoClouds, 10, meta)
    noDataMask = (toaRadiance == noDataValue)
    toaBT = radiance2BrightnessTemperature(toaRadiance, meta)
    emissivity = buildingFraction * buildingEmissivity + roadsFraction * roadEmissivity + (1 - buildingFraction - roadsFraction) * vegetationEmissivity
    lst = bt2lstSingleWindow(toaBT - 273, emissivity)
    lst = np.where(noDataMask, np.nan, lst)
    return lst

def splitAlong(data, bbox, outline):
    outlineRasterized = pixelizeCoverageFraction([outline], bbox, data.shape)
    inside = data * outlineRasterized
    outside = data - inside
    return inside, outside 




pathToLs8Data          = "./ls8"
pathToOsmDataBuildings = "./osm/buildings.geo.json"
pathToOsmDataRoads     = "./osm/roads.geo.json"


buildingData = fiona.open(pathToOsmDataBuildings)
roadData = fiona.open(pathToOsmDataRoads)
scenes = []
for dir in os.listdir(pathToLs8Data):
    if dir[-3:] != "tar":
        scenes.append({
            "b10":   f"{pathToLs8Data}/{dir}/{dir}_B10.TIF",
            "qa":    f"{pathToLs8Data}/{dir}/{dir}_QA_PIXEL.TIF",
            "meta":  f"{pathToLs8Data}/{dir}/{dir}_MTL.json"
        })
distance = 2 * getMaxPixelSize(scenes[0]["b10"])
roadSize = 0.01 * distance


with open("deltaTs.csv", "w") as dest:
    fields = ["buildingId"] + [p for p in os.listdir(pathToLs8Data) if p[-3:] != "tar"]
    writer = csv.DictWriter(dest, fieldnames=fields)
    writer.writeheader()

    buildings = [bld for bld in buildingData]
    for i, building in enumerate(buildings):
        print(f"... {100 * i / len(buildings)}% ...")
        if i > 500:
            break

        buildingGeometry = building["geometry"]
        shp              = shape(buildingGeometry)
        outline          = shp.exterior
        boutline         = shp.buffer(distance)
        bbox             = boutline.bounds

        neighboringBuildings = [b for b in buildingData.filter(bbox=bbox)]
        neighborGeometries   = [b["geometry"] for b in neighboringBuildings]
        neighborRoads        = [shape(r["geometry"]).buffer(roadSize) for r in roadData.filter(bbox=bbox)]

        data = {}
        for scene in scenes:
            meta                  = readJson(scene["meta"])
            b10                   = getPixelData(scene["b10"], bbox)[0]
            qa                    = getPixelData(scene["qa"], bbox)[0]
            
            housesFraction        = pixelizeCoverageFraction(neighborGeometries, bbox, b10.shape)
            roadsFraction         = pixelizeCoverageFraction(neighborRoads, bbox, b10.shape)
            lst                   = estimateLst(b10, qa, meta, housesFraction, roadsFraction)
            
            buildingFraction      = pixelizeCoverageFraction([buildingGeometry], bbox, b10.shape)
            buildingFractionNorm  = buildingFraction / np.sum(buildingFraction)
            nrHouses              = 1
            nrNonHouses           = buildingFractionNorm.size - nrHouses
            tMeanInside           = np.sum(lst * buildingFractionNorm) / nrHouses
            tMeanOutside          = np.sum(lst * (1.0 - buildingFractionNorm)) / nrNonHouses
            deltaT                = tMeanInside - tMeanOutside

            if not np.isnan(deltaT):
                data[meta["LANDSAT_METADATA_FILE"]["PRODUCT_CONTENTS"]["LANDSAT_PRODUCT_ID"]] = deltaT

        data["buildingId"] = building.id
        writer.writerow(data)


print("Done!")

# %%
f = open("./osm/buildings.geo.json")
jsondata = json.load(f)
f = open("./deltaTs.csv")
reader = csv.DictReader(f)

def find(arr, func):
    for el in arr:
        if func(el):
            return el

for row in reader:
    id = row["buildingId"]
    feature = find(jsondata["features"], lambda f: f["properties"]["id"] == id)
    if feature:
        feature["properties"]["deltaTs"] = row


f = open("./buildings.geojson", "w")
json.dump(jsondata, f)
    
# %%
