#%%
import os
import json
import numpy as np
import fiona
from shapely.geometry import shape
import matplotlib.pyplot as plt

from raster import readTif, tifGetPixelSizeDegrees, tifGetBbox
from vectorAndRaster import rasterizePercentage
from analyze import extractClouds, scaleBandData, radiance2BrightnessTemperature, bt2lstSingleWindow


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

def estimateLst(b10, qa, meta, buildingFraction):
    noDataValue = -9999
    vegetationEmissivity = 0.973
    buildingEmissivity   = 0.979  # guestimate ;)

    b10NoClouds = extractClouds(b10, qa, noDataValue)
    toaRadiance = scaleBandData(b10NoClouds, 10, meta)
    noDataMask = (toaRadiance == noDataValue)
    toaBT = radiance2BrightnessTemperature(toaRadiance, meta)
    emissivity = buildingFraction * buildingEmissivity + (1 - buildingFraction) * vegetationEmissivity
    lst = bt2lstSingleWindow(toaBT - 273, emissivity)
    lst = np.where(noDataMask, np.nan, lst)
    return lst

def splitAlong(data, bbox, outline):
    outlineRasterized = pixelizeCoverageFraction([outline], bbox, data.shape)
    inside = data * outlineRasterized
    outside = data - inside
    return inside, outside 


pathToLs8Data = "./ls8"
pathToOsmDataBuildings = "./osm/buildings.geo.json"


osmData = fiona.open(pathToOsmDataBuildings)
scenes = []
for dir in os.listdir(pathToLs8Data):
    if dir[-3:] != "tar":
        scenes.append({
            "b10":   f"{pathToLs8Data}/{dir}/{dir}_B10.TIF",
            "qa":    f"{pathToLs8Data}/{dir}/{dir}_QA_PIXEL.TIF",
            "meta":  f"{pathToLs8Data}/{dir}/{dir}_MTL.json"
        })
distance = 2 * getMaxPixelSize(scenes[0]["b10"])


i = 0
deltaTsGlobal = {}
for building in osmData:
    print(f"Building {i}...")
    i += 1

    try:
        buildingGeometry = building["geometry"]
        shp              = shape(buildingGeometry)
        outline          = shp.exterior
        boutline         = shp.buffer(distance)
        bbox             = boutline.bounds

        neighboringBuildings = [building for building in osmData.filter(bbox=bbox)]
        neighborGeometries   = [b["geometry"] for b in neighboringBuildings]

        deltaTs = {}
        for scene in scenes:
            meta                  = readJson(scene["meta"])
            b10                   = getPixelData(scene["b10"], bbox)[0]
            qa                    = getPixelData(scene["qa"], bbox)[0]
            
            neighborhoodFraction  = pixelizeCoverageFraction(neighborGeometries, bbox, b10.shape)
            lst                   = estimateLst(b10, qa, meta, neighborhoodFraction)
            
            buildingFraction      = pixelizeCoverageFraction([buildingGeometry], bbox, b10.shape)
            buildingFractionNorm  = buildingFraction / np.sum(buildingFraction)
            nrHouses              = 1
            nrNonHouses           = buildingFractionNorm.size - nrHouses
            tMeanInside           = np.sum(lst * buildingFractionNorm) / nrHouses
            tMeanOutside          = np.sum(lst * (1.0 - buildingFractionNorm)) / nrNonHouses
            deltaT                = tMeanInside - tMeanOutside

            if deltaT != np.nan:
                deltaTs[meta["LANDSAT_METADATA_FILE"]["PRODUCT_CONTENTS"]["LANDSAT_PRODUCT_ID"]] = deltaT

        deltaTsGlobal[building.id] = deltaTs

    except Exception as e:
        print(e)

#%%

