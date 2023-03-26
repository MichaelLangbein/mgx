import numpy as np
import rasterio.transform as riot
import rasterio.features as riof


def rasterizeGeojson(geojson, bbox, imgShape):
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
    imgH -= 1
    imgW -= 1

    lonMin, latMin, lonMax, latMax = bbox

    scaleX = (lonMax - lonMin) / imgW
    transX = lonMin
    scaleY = -(latMax - latMin) / imgH
    transY = latMax

    tMatrix = np.array([
        [scaleX, 0, transX],
        [0, scaleY, transY],
        [0, 0, 1]
    ])
    lon_tl, lat_tl, _ = tMatrix @ np.array([0, 0, 1])
    lon_br, lat_br, _ = tMatrix @ np.array([imgW, imgH, 1])
    assert(lon_tl == lonMin)
    assert(lat_tl == latMax)
    assert(lon_br == lonMax)
    assert(lat_br == latMin)

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
