#%%
from raster import readTif, tifGetPixelSize


def readGeoJson(path):
    pass

def getBbox(feature, buffer):
    pass

def getOutline(feature):
    pass

def getPixelData(ls8Data, bbox):
    """
        Goes through all scenes
        and returns pixels inside this bbox
    """
    pass

def getLandCoverPercentages(osmData, bbox, shape):
    """
        for each pixel, returns percentage of land-cover classes
        building, vegetation, water
    """
    pass

def estimateLst(pixelData, landCoverPercentages):
    pass

def getMeanInside(data, outline, weight = None):
    pass

def getMeanOutside(data, outline, weight = None):
    pass



pathToOsmDataBuildings = ""
pathToOsmDataTrees = ""
pathToOsmDataWater = ""
pathToLs8Data = []

osmData = { 
    "buildings": readGeoJson(pathToOsmDataBuildings),
    "trees": readGeoJson(pathToOsmDataTrees),
    "water": readGeoJson(pathToOsmDataWater)
}
ls8Data = [
    readTif(path)
    for path in pathToLs8Data
]
buffer = tifGetPixelSize(ls8Data[0])


for building in osmData["buildings"]:

    bbox = getBbox(building, buffer)
    outline = getOutline(building)
    
    pixelData = getPixelData(ls8Data, bbox)
    percentages = getLandCoverPercentages(osmData, bbox, pixelData[0].shape)
    lsts = estimateLst(pixelData, percentages)

    lstInside  = getMeanInside(lsts, outline, percentages["buildings"])
    lstOutside = getMeanOutside(lsts, outline, 1 - percentages["buildings"])
    deltaT = lstInside - lstOutside

