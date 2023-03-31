#%%
import os
import stac as s
import osm as o
import json
import numpy as np
from PIL import Image

# %% 0: Directory-structure
bbox = {
    "lonMin": 11.213092803955078,
    "latMin": 48.06580565720895,
    "lonMax": 11.300640106201172,
    "latMax": 48.09161057547795
}

thisDir = os.getcwd()
assetDir = os.path.join(thisDir, "assets")
osmDir = os.path.join(assetDir, "osm")
s2Dir = os.path.join(assetDir, "s2")
outDir = os.path.join(assetDir, "dataset")
os.makedirs(osmDir, exist_ok=True)
os.makedirs(s2Dir, exist_ok=True)
os.makedirs(outDir, exist_ok=True)

#%% 1: Download scene
s.downloadAndSaveS2Data(s2Dir, bbox, 1, 10, None, False)

#%% 2: From scene, get subsets and associated bounding-shapes
fileName = f"{s2Dir}/S2B_32UPU_20230210_0_L2A/TCI.tif"
fh = s.readTif(fileName)
height, width = s.tifGetPixelRowsCols(fh)

H = 256
W = 256
nrSamples = 25

bboxes = []
for y0 in np.linspace(0, height-H, int(np.sqrt(nrSamples))):
    for x0 in np.linspace(0, width-W, int(np.sqrt(nrSamples))):
        x1 = x0 + W
        y1 = y0 + H
        lonBL, latBL = s.tifPixelToLonLat(fh, y1, x0)
        lonTR, latTR = s.tifPixelToLonLat(fh, y0, x1)
        bboxes.append({ "lonMin": lonBL, "lonMax": lonTR, "latMin": latBL, "latMax": latTR })

#%% 3: For every subset, get osm-data
for bbox in bboxes:
    osmData = o.downloadAndSaveOSM(osmDir, bbox)
    

#%% 4: Rasterize osm together with cloud-mask

def clamp(start, val, end):
    if val < start:
        return start
    if val > end:
        return end
    return val

dirs = os.listdir(osmDir)
for dir in dirs:
    box = [float(v) for v in dir.split(",")]
    bbox = {"latMin": box[0], "lonMin": box[1], "latMax": box[2], "lonMax": box[3]}

    buildingsFile = open(os.path.join(osmDir, dir, "buildings.geo.json"))
    buildings     = json.load(buildingsFile)
    treesFile     = open(os.path.join(osmDir, dir, "trees.geo.json"))
    trees         = json.load(treesFile)
    waterFile     = open(os.path.join(osmDir, dir, "water.geo.json"))
    water         = json.load(waterFile)

    r0, c0 = s.tifCoordToPixel(fh, bbox["lonMin"], bbox["latMax"])
    r0 = clamp(0, r0, height-H)
    c0 = clamp(0, c0, width-W)
    baseData = s.tifGetPixels(fh, r0, r0 + H, c0, c0 + W)

    buildingsRaster = o.rasterizeGeojson(buildings, bbox, (H, W))
    treesRaster     = o.rasterizeGeojson(trees, bbox, (H, W))
    waterRaster     = o.rasterizeGeojson(water, bbox, (H, W))
    #  @TODO: cloud mask
    labelData = 1 * buildingsRaster + 2 * treesRaster + 3 * waterRaster


    dataPointDir = os.path.join(outDir, dir)
    os.makedirs(dataPointDir)
    imIn = Image.fromarray(np.moveaxis(baseData, 0, -1), mode="RGB")
    imInPadded = Image.new("RGB", (H, W))
    imInPadded.paste(imIn)
    imInPadded.save(os.path.join(dataPointDir, "input.png"))
    imOut = Image.fromarray(labelData, mode="L")
    imOutPadded = Image.new("L", (H, W))
    imOutPadded.paste(imOut)
    imOutPadded.save(os.path.join(dataPointDir, "output.png"))


# %%
# import matplotlib.pyplot as plt
# imgIn = Image.open(f"{outDir}/47.9878843274017,11.059004076248508,48.01028175446573,11.094223436599277/input.png")
# dataIn = np.array(imgIn.getdata()).reshape((H, W, 3))
# imgOut = Image.open(f"{outDir}/47.9878843274017,11.059004076248508,48.01028175446573,11.094223436599277/output.png")
# dataOut = np.array(imgOut.getdata()).reshape((H, W))
# fig, axes = plt.subplots(1, 2)
# axes[0].imshow(dataIn)
# axes[1].imshow(dataOut)
# %%
