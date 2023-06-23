#%%
import os
import json
import tarfile

from pyproj import CRS
from raster import makeTransform, readTif, saveToTif, tifGetBbox
from osm import downloadAndSaveOSM
from download import downloadLandsat
from analyze import bt2lstSingleWindow, emissivityFromOSM, extractClouds, lstFromFile_Avdan, radiance2BrightnessTemperature, readMetaData, scaleBandData
import numpy as np


#%%
dirPath = os.path.dirname(os.path.realpath(__file__))
aoi = { "lonMin": 11.214, "latMin": 48.064, "lonMax": 11.338, "latMax": 48.117 }
startDate = "2020-11-01"
endDate = "2021-03-01"

#%%
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
osmData = {}
try:
    osmData = {
        "buildings": readGeoJson(f"{dirPath}/osm/buildings.geo.json"),
        "trees": readGeoJson(f"{dirPath}/osm/trees.geo.json"),
        "water": readGeoJson(f"{dirPath}/osm/water.geo.json")
    }
except:
    osmData = downloadAndSaveOSM(aoi, saveToDirPath=f"{dirPath}/osm", getBuildings=True, getTrees=True, getWater=True)


# get ls8 data
ls8files = [os.path.abspath(os.path.join(f"{dirPath}/ls8", f)) for f in os.listdir(f"{dirPath}/ls8") if f.endswith(".tar")]
if len(ls8files) == 0:
    ls8files = downloadLandsat(aoi, startDate, endDate, 50, outputDir=f"{dirPath}/ls8")


#%%
for ls8file in ls8files:
    print(f"...... processing file {ls8file} .........")

    pathToFile, fileNameBase = extractLs8Tar(ls8file)

    base = f"{pathToFile}/{fileNameBase}"
    # `noDataValue` must not be np.nan, because then `==` doesn't work as expected
    noDataValue = -9999

    metaData = readMetaData(base + "MTL.json")

    qaPixelFh        = readTif(base + "QA_PIXEL.TIF")
    toaRadiance10Fh  = readTif(base + "B10.TIF")
    assert(qaPixelFh.res == toaRadiance10Fh.res)

    qaPixelAOI        = tifGetBbox(qaPixelFh, aoi)[0]
    toaRadiance10AOI  = tifGetBbox(toaRadiance10Fh, aoi)[0]

    toaRadiance10NoClouds = extractClouds(toaRadiance10AOI, qaPixelAOI, noDataValue)

    # Converting raw scaled sensor-data to spectral radiance [W/m²]
    toaRadiance10 = scaleBandData(toaRadiance10NoClouds, 10, metaData)

    noDataMask = (toaRadiance10 == noDataValue)

    # Step 1: radiance to at-sensor temperature (brightness temperature BT)
    toaBT10 = radiance2BrightnessTemperature(toaRadiance10, metaData)
    toaBT10 = np.where(noDataMask, noDataValue, toaBT10)

    # Step 2: estimate emissivity from OSM data
    emissivity10 = emissivityFromOSM(10, aoi, toaRadiance10.shape, osmData["buildings"], osmData["trees"])

    # Step 3: black-body-temperature to land-surface-temperature
    landSurfaceTemperature = bt2lstSingleWindow(toaBT10 - 273.15, emissivity10)
    landSurfaceTemperature = np.where(noDataMask, np.nan, landSurfaceTemperature)

    # adding projection metadata
    imgH, imgW = landSurfaceTemperature.shape
    transform = makeTransform(imgH, imgW, aoi)
    saveToTif(f"{pathToFile}/lst.tif", landSurfaceTemperature, CRS.from_epsg(4326), transform, noDataValue)
    lstTif = readTif(f"{pathToFile}/lst.tif")


    for building in osmData["buildings"]["features"]:
        
        props = building["properties"]
        geom  = building["geometry"]["coordinates"][0]

        buildingBbox = calcBbox(geom)

        try:
            pixelData = tifGetBbox(lstTif, buildingBbox)
            meanT = np.mean(pixelData)

            if "timeseries" not in props:
                props["timeseries"] = {}
            
            props["timeseries"][fileNameBase] = meanT

            print(f"temp: {meanT}")
        except Exception as e:
            print(f"error {e}")

# %%

with open("./buildings_analyzed.geo.json", "w") as fh:
    fh.writelines(json.dumps(osmData["buildings"], indent=4))
# %%
