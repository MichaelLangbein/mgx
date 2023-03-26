import os
from urllib.parse import urlparse
import rasterio as rio
from pyproj.transformer import Transformer
from pystac_client import Client
import requests as req



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

def tifGetPixels(fh, r0, r1, c0, c1):
    pass

def tifPixelToCoords(fh, r, c):
    pass

def tifCoordToPixel(fh, lon, lat, srcCrs="EPSG:4326"):
    coordTransformer = Transformer.from_crs(srcCrs, fh.crs)
    coordsTifCrs = coordTransformer.transform(lat, lon)
    pixel = fh.index(coordsTifCrs[0], coordsTifCrs[1])
    return pixel

def tifGetBbox(bbox, fh):
    pixelUpperLeft = tifCoordToPixel(fh, bbox[3], bbox[0])
    pixelLowerRight = tifCoordToPixel(fh, bbox[1], bbox[2])
    window = rio.windows.Window.from_slices(
        ( pixelUpperLeft[0],  pixelLowerRight[0] ), 
        ( pixelUpperLeft[1],  pixelLowerRight[1] )
    )
    subset = fh.read(1, window=window)
    return subset

def downloadAndSaveS2(saveToDirPath, aoi, maxNrScenes=1, maxCloudCover=10, bands=None, downloadWindowOnly=True):
    catalog = Client.open("https://earth-search.aws.element84.com/v0")

    searchResults = catalog.search(
        collections=['sentinel-s2-l2a-cogs'],
        bbox=aoi,
        max_items=maxNrScenes,
        query={
            "eo:cloud_cover": { "lt": maxCloudCover },
            "sentinel:valid_cloud_cover": { "eq": True }  # we want to have the cloud mask in there, too.
        },
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
    fullData = {}
    for item in searchResults.get_items():
        itemData = {}
        for key, val in item.assets.items():
            if shouldDownload(key, val):
                if downloadWindowOnly:
                    with rio.open(val.href) as fh:
                        subset = tifGetBbox(aoi, fh)
                        itemData[key] = subset
                    fullFilePath = hrefToDownloadPath(val.href, item.id)
                    # @TODO: adjust transform to window
                    saveToTif(fullFilePath, subset, fh.crs, fh.transform, fh.nodata)
                else:
                    fullFilePath = hrefToDownloadPath(val.href, item.id)
                    response = req.get(val.href)
                    saveToTif(fullFilePath, response.content,  fh.crs, fh.transform, fh.nodata)

        fullData[item.id] = itemData
    return fullData


# s2Data = downloadAndSaveS2(s2Dir, bbox, 1, 10, ["visual"])
