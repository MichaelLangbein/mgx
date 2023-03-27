#%%
import os
import stac as s
import osm as o

# %% 0: Directory-structure
bbox = [
    11.213092803955078,
    48.06580565720895,
    11.300640106201172,
    48.09161057547795
]

thisDir = os.getcwd()
assetDir = os.path.join(thisDir, 'assets')
osmDir = os.path.join(assetDir, 'osm')
s2Dir = os.path.join(assetDir, 's2')
os.makedirs(osmDir, exist_ok=True)
os.makedirs(s2Dir, exist_ok=True)

#%% 1: Download scene
s.downloadAndSaveS2Data(s2Dir, bbox, 1, 10, None, False)

#%% 2: From scene, get subsets and associated bounding-shapes
fileName = "/Users/michaellangbein/Desktop/code.nosync/geo/assets/s2/S2B_32UPU_20230210_0_L2A/TCI.tif"
fh = s.readTif(fileName)
height, width = s.tifGetPixelRowsCols(fh)

H = 256
W = 256

bboxes = []
for i in range(2 * width // W  - 1):
    for j in range(2 * height // H  - 1):
        x0 = i * H / 2
        y0 = j * W / 2
        x1 = x0 + W
        y1 = y0 + H
        lonBL, latBL = s.tifPixelToLonLat(fh, y1, x0)
        lonTR, latTR = s.tifPixelToLonLat(fh, y0, x1)
        bboxes.append({ "lonMin": lonBL, "lonMax": lonTR, "latMin": latBL, "latMax": latTR })

#%% 3: For every subset, get osm-data
for bbox in bboxes:
    osmData = o.downloadAndSaveOSM(osmDir, [bbox["lonMin"], bbox["latMin"], bbox["lonMax"], bbox["latMax"]])
    

#%% 4: Rasterize osm together with cloud-mask
#%% 5: Save subset as image and rasterized osm as image