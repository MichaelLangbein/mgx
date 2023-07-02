#%%
import numpy as np
import matplotlib.pyplot as plt
import geopandas as gpd
from pyproj import CRS
from raster import makeTransform, readTif, saveToTif, tifGetBbox
import json

#%%
def readGeoJson(path):
    try:
        fh = open(path)
        data = json.load(fh)
        return data
    except:
        return None
    
# %%
date_ = "2021-02-21"
date = "20210221"
filename = f"../geoserver/geoserverconfig/data/lst-{date_}.tif"
pixelDataTif = readTif(filename)
pixelData = pixelDataTif.read(1)
plt.imshow(pixelData)

# %%
buildings = readGeoJson("../client3/src/app/data/buildings_analyzed.geo.json")


# %%
temps = []
for building in buildings["features"]:
    try:
        temps.append(building["properties"]["timeseries"][date])
    except Exception as e:
        print(e)

tempsFiltered = [t for t in temps if t > -100]

plt.hist(tempsFiltered, bins=20)


#%%
from shapely.geometry import shape



def temp(building, buildings, pixelDataTif):
    t = building["properties"]["timeseries"][date]
    if t < -30 or t > 50:
        t = np.nan
    return t


def tempVsEnv(building, buildings, pixelDataTif):

    widthPx = pixelDataTif.width
    widthLg = pixelDataTif.bounds.right - pixelDataTif.bounds.left
    LgPerPx = widthLg / widthPx

    t = temp(building, buildings, pixelDataTif)

    geom = building["geometry"]
    geomShape = shape(geom)
    geomBuff = geomShape.buffer(LgPerPx)
    (lonMin, latMin, lonMax, latMax) = geomBuff.bounds
    bbox = {"lonMin": lonMin, "latMin": latMin, "lonMax": lonMax, "latMax": latMax}
    surroundings = tifGetBbox(pixelDataTif, bbox)

    surroundings[0][1:-1, 1:-1] = np.nan
    mean = np.nanmean(surroundings)

    tVsEnv = t - mean
    if tVsEnv < -30 or 40 < tVsEnv:
        tVsEnv = np.nan

    return tVsEnv



nrBuildings = len(buildings["features"])
for i, building in enumerate(buildings["features"]):
    if i % 10 == 0:
        print(f"{100 * i/nrBuildings}%")
    try:
        building["properties"]["T"]         = temp(building, buildings, pixelDataTif)
        building["properties"]["T_vs_env"]  = tempVsEnv(building, buildings, pixelDataTif)
    except Exception as e:
        print(e)

# %%
df = gpd.GeoDataFrame.from_features(buildings)
df.plot(column="T", cmap="cool", legend=True, figsize=(14, 5))


# %%
df = gpd.GeoDataFrame.from_features(buildings)
df.plot(column="T_vs_env", cmap="cool", legend=True, figsize=(14, 5))

# %%
diffs = []
for building in buildings["features"]:
    if "properties" in building:
        if "T_vs_env" in building["properties"]:
            tVsEnv = building["properties"]["T_vs_env"]
            if -30 < tVsEnv < 50:
                diffs.append(tVsEnv)
plt.hist(diffs, bins=50)
# %%
