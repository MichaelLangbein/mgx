#%%
import os
from urllib.parse import urlparse
import rasterio as rio
from pyproj.transformer import Transformer
from pystac_client import Client
import requests as req
import numpy as np
import rasterio.transform as riot

#%%


def makeTransform(imgH, imgW, bbox):

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

    return transform

def readTif(targetFilePath):
    fh = rio.open(targetFilePath, "r", driver="GTiff")
    return fh

def saveToTif(targetFilePath: str, data: np.ndarray, crs: str, transform, noDataVal):
    h, w = data.shape
    options = {
        'driver': 'GTiff',
        'compress': 'lzw',
        'width': w,
        'height': h,
        'count': 1,
        'dtype': data.dtype,
        'crs': crs, 
        'transform': transform,
        'nodata': noDataVal
    }
    with rio.open(targetFilePath, 'w', **options) as dst:
        dst.write(data, 1)

def tifGetPixelRowsCols(fh):
    h = fh.height
    w = fh.width
    return (h, w)

def tifGetGeoExtent(fh):
    bounds = fh.bounds
    coordTransformer = Transformer.from_crs(fh.crs, "EPSG:4326")
    bounds4326 = coordTransformer.transform_bounds(*bounds)
    return bounds4326

def tifPixelToLonLat(fh, r, c):
    x, y = fh.xy(r, c)
    coordTransformer = Transformer.from_crs(fh.crs, "EPSG:4326")
    lat, lon = coordTransformer.transform(x, y)
    return lon, lat

def tifLonLatToPixel(fh, lon, lat):
    coordTransformer = Transformer.from_crs("EPSG:4326", fh.crs, always_xy=True)
    # transform: (xx, yy), see: https://pyproj4.github.io/pyproj/stable/api/transformer.html
    coordsTifCrs = coordTransformer.transform(lon, lat) 
    pixel = fh.index(coordsTifCrs[0], coordsTifCrs[1])
    return pixel

def tifGetBbox(fh, bbox):
    r0, c0 = tifLonLatToPixel(fh, bbox["lonMin"], bbox["latMax"])
    r1, c1 = tifLonLatToPixel(fh, bbox["lonMax"], bbox["latMin"])
    return tifGetPixels(fh, r0, r1, c0, c1)

def tifGetPixels(fh, r0, r1, c0, c1, channels=None):
    # adding one so that end-index is also included
    window = rio.windows.Window.from_slices(( r0,  r1+1 ), ( c0,  c1+1 ))
    subset = fh.read(channels, window=window)
    return subset

def downloadAndSaveS2Data(saveToDirPath, bbox, maxNrScenes=1, maxCloudCover=10, bands=None, downloadWindowOnly=True):
    catalog = Client.open("https://earth-search.aws.element84.com/v0")

    lonMin = bbox["lonMin"]
    latMin = bbox["latMin"]
    lonMax = bbox["lonMax"]
    latMax = bbox["latMax"]

    collections = ['sentinel-s2-l2a-cogs']
    queryParas = {
        "eo:cloud_cover": { 
            "lt": maxCloudCover
        },
        "sentinel:valid_cloud_cover": { "eq": True }  # we want to have the cloud mask in there, too.
    }

    searchResults = catalog.search(
        collections = collections,
        bbox        = [lonMin, latMin, lonMax, latMax],
        max_items   = maxNrScenes,
        query       = queryParas,
    )

    def shouldDownload(key, val):
        if not val.href.endswith('tif'):
            return False
        if bands is not None and key not in bands:
            return False
        return True
        
    def hrefToDownloadPath(href, id):
        url = urlparse(href)
        fileName = os.path.basename(url.path)
        targetDir = os.path.join(saveToDirPath, id)
        os.makedirs(targetDir, exist_ok=True)
        fullFilePath = os.path.join(targetDir, fileName)
        return fullFilePath

    #  downloading only bbox-subset
    for item in searchResults.get_items():
        for key, val in item.assets.items():
            if shouldDownload(key, val):
                print(f"Getting {item.id}/{key} ...")
                with rio.open(val.href) as fh:
                    if downloadWindowOnly:
                        subset = tifGetBbox(fh, bbox)
                        fullFilePath = hrefToDownloadPath(val.href, item.id)
                        # @TODO: adjust transform to window
                        saveToTif(fullFilePath, subset, fh.crs, fh.transform, fh.nodata)
                    else:
                        fullFilePath = hrefToDownloadPath(val.href, item.id)
                        response = req.get(val.href)
                        with open(fullFilePath, 'wb') as tfh:
                            tfh.write(response.content)  

# downloadAndSaveSatelliteData(s2Dir, "s2", [11, 47, 12, 48], maxNrScenes=4, maxCloudCover=10, bands=None, downloadWindowOnly=False)
# %%
