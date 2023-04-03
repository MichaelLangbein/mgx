#%%
import os
import stac as s
import osm as o
import json
import numpy as np
import matplotlib.pyplot as plt

# %% 0: Directory-structure
bbox = {
    "lonMin": 11.213092803955078,
    "latMin": 48.06580565720895,
    "lonMax": 11.300640106201172,
    "latMax": 48.09161057547795
}

thisDir = os.getcwd()
assetDir = os.path.join(thisDir, "assets")
s2Dir = os.path.join(assetDir, "s2")
outDir = os.path.join(assetDir, "dataset")
os.makedirs(s2Dir, exist_ok=True)
os.makedirs(outDir, exist_ok=True)

def clamp(start, val, end):
    if val < start:
        return start
    if val > end:
        return end
    return val

#%% 1: Download scene
# s.downloadAndSaveS2Data(s2Dir, bbox, 1, 10, None, False)

#%% 
fileName = f"{s2Dir}/S2B_32UPU_20230210_0_L2A/TCI.tif"
fh = s.readTif(fileName)
height, width = s.tifGetPixelRowsCols(fh)

H = 256
W = 256

i = 0
I = len(np.arange(0, height-H, H//2)) * len(np.arange(0, width-W, W//2))
for y0 in np.arange(0, height-H, H//2):
    for x0 in np.arange(0, width-W, W//2):
        i+= 1

        # 2: From scene, get subsets and associated bounding-shapes
        x1 = x0 + W
        y1 = y0 + H
        lonBL, latBL = s.tifPixelToLonLat(fh, y1, x0)
        lonTR, latTR = s.tifPixelToLonLat(fh, y0, x1)
        bbox = { "lonMin": lonBL, "lonMax": lonTR, "latMin": latBL, "latMax": latTR }
        print(f"{i}/{I}={100 * i / I}% -- {bbox})")

        # 3: For every subset, get osm-data
        osmData = o.downloadAndSaveOSM(bbox, None)
        buildings = osmData["buildings"]
        trees     = osmData["trees"]
        water     = osmData["water"]
    

        # 4: Rasterize osm together with cloud-mask
        baseData = s.tifGetPixels(fh, y0, y1, x0, x1)
        _c, _h, _w = baseData.shape
        paddingC = (0, 0)
        paddingH = (0, H - _h)
        paddingW = (0, W - _w)
        baseDataPadded = np.pad(baseData, [paddingC, paddingH, paddingW], mode='constant', constant_values=0)

        buildingsRaster = o.rasterizeGeojson(buildings, bbox, (H, W))
        treesRaster     = o.rasterizeGeojson(trees, bbox, (H, W))
        waterRaster     = o.rasterizeGeojson(water, bbox, (H, W))
        #  @TODO: cloud mask
        #                     red              green        blue
        labelData = np.stack((buildingsRaster, treesRaster, waterRaster))
        _c, _h, _w = labelData.shape
        paddingC = (0, 0)
        paddingH = (0, H - _h)
        paddingW = (0, W - _w)
        labelDataPadded = np.pad(labelData, [paddingC, paddingH, paddingW], mode='constant', constant_values=0)

        #5 metadata
        metadata = {
            "scene": "S2B_32UPU_20230210_0_L2A",
            "band": "TCI",
            "bbox": bbox,
        }

        # 6: save
        dataPointDir = os.path.join(outDir, str(i))
        os.makedirs(dataPointDir)

        with open(os.path.join(dataPointDir, "metadata.json"), 'w') as mdfh:
            json.dump(metadata, mdfh, indent=4)
        np.save(os.path.join(dataPointDir, "input.npy"), baseDataPadded, allow_pickle=True)
        np.save(os.path.join(dataPointDir, "output.npy"), labelDataPadded, allow_pickle=True)


        # 7: plot occasionally
        if i == 1 or i % 100 == 0:
            plt.figure(figsize=(7, 7))
            plt.imshow(np.moveaxis(baseDataPadded, 0, -1))
            plt.imshow(np.moveaxis(labelDataPadded, 0, -1) * 200, alpha=0.25)
            plt.suptitle(str(metadata["bbox"]))
            fig = plt.gcf() # getting current figure before it's shown
            plt.show()
            fig.savefig(os.path.join(outDir, "..", "datasets_previews", str(i) + ".png"))


# %%
#
assetNr = np.random.randint(1, len(os.listdir(outDir)))
dataIn = np.load(os.path.join(outDir, str(assetNr), "input.npy"), 'r', allow_pickle=True)
dataOut = np.load(os.path.join(outDir, str(assetNr), "output.npy"), 'r', allow_pickle=True)
f = open(os.path.join(outDir, str(assetNr), "metadata.json"), 'r')
metaData = json.load(f)
plt.figure(figsize=(7, 7))
plt.imshow(np.moveaxis(dataIn, 0, -1))
plt.imshow(np.moveaxis(dataOut, 0, -1) * 200, alpha=0.25)
plt.suptitle(str(metaData)[:50])
plt.suptitle(str(metaData)[50:])
# %%
