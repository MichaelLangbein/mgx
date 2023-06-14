import os
import json
import tarfile
import fiona as f
from helpers import tifGetBbox
from osm import downloadAndSaveOSM
from download import downloadLandsat
from analyze import processFile
import numpy as np

dirPath = os.path.dirname(os.path.realpath(__file__))
bbox = { "lonMin": 11.214, "latMin": 48.064, "lonMax": 11.338, "latMax": 48.117 }
startDate = "2022-01-01"
endDate = "2023-06-01"


# helpers

def readGeoJson(path):
    try:
        fh = open(path)
        data = json.load(fh)
        return data
    except:
        return None


def extractLs8Tar(path):
    pathExtracted = path.replace(".tar", "")
    fileName = os.path.basename(path).replace(".tar", "")
    fh = tarfile.open(path)
    fh.extractall(pathExtracted)
    fh.close()
    return pathExtracted, fileName + "_"

def calcBbox(points):
    lonMin = min(point[0] for point in points)
    latMin = min(point[1] for point in points)
    lonMax = max(point[0] for point in points)
    latMax = max(point[1] for point in points)
    return {"lonMin": lonMin, "latMin": latMin, "lonMax": lonMax, "latMax": latMax}


# get osm data
buildings = readGeoJson(f"{dirPath}/osm/buildings.geo.json")
if not buildings:
    buildings = downloadAndSaveOSM(bbox, saveToDirPath=f"{dirPath}/osm", getBuildings=True, getTrees=False, getWater=False)


# get ls8 data
ls8files = [os.path.abspath(os.path.join(f"{dirPath}/ls8", f)) for f in os.listdir(f"{dirPath}/ls8") if f.endswith(".tar")]
if len(ls8files) == 0:
    ls8files = downloadLandsat(bbox, startDate, endDate, 10, outputDir=f"{dirPath}/ls8")



for ls8file in ls8files:

    # extract
    pathExtracted, fileNameBase = extractLs8Tar(ls8file)
    
    # analyze landsat8
    lst, lstFh = processFile(pathExtracted, fileNameBase, bbox)

    # merge buildings with lst
    for building in buildings["features"]:
        geometry = building["geometry"]
        props = building["properties"]
        id = props["id"]
        bbox = calcBbox(geometry["coordinates"][0])
        pixels = tifGetBbox(lstFh, bbox)
        tempMean = np.mean(pixels)

        # ingest into database