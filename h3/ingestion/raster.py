#%%
import rasterio as rio
import rasterio.features as riof
from pyproj.transformer import Transformer
from pystac_client import Client
import numpy as np
import rasterio.transform as riot

#%%


def makeTransform(imgH, imgW, bbox):
    """
        Requires bbox to be given in EPSG:4326
    """

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

def tifGetPixelSize(fh):
    pass

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


