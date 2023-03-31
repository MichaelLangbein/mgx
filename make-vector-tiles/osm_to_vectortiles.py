"""
1. Download data
    - free:
        - source: geofabrik
        - convert osm.pbf to mbtiles: tilemaker (https://github.com/systemed/tilemaker)
    - paid: 
        - openmaptiles (one-time-pay)
2. extract data
    2.1. mb-util: `mb-util --scheme=xyz --image_format=pbf 2017-07-03_germany_bamberg.mbtiles extractedDir`
    2.2. rename: `find . -name '*.pbf' -exec mv '{}' '{}'.gz  \;`
    2.3. extract: ` find . -name '*.gz' -exec gunzip '{}' \;`  (otherwise Error: Unimplemented type: 3)
3. Download style
    - https://openmaptiles.org/styles/
4. Edit style
    4.1. tiles & fonts:
        ```json
                "sources": {
                "openmaptiles": {
                    "type": "vector",
                    "tiles": ["http://localhost:8080/assets/extracted/{z}/{x}/{y}.pbf"]
                    }
                },
                "glyphs": "http://localhost:8080/assets/fonts/{fontstack}/{range}.pbf",
        ```
5. Download fonts:
    - https://blog.kleunen.nl/blog/tilemaker-generate-map
6. Display on map
    6.1. Must be same projection: EPSG:3857
    6.2. Data must not be gzipped
"""

#%% imports
import os
import argparse as ap
import requests as req
from urllib.parse import urlparse
import shutil as shu

import mbutil as mb
from utils import downloadFromUrlTo, replaceInFile


#%% Part 0: directories
thisDir = os.getcwd()
tileMakerDir = os.path.join(thisDir, 'processing')
assetDir = os.path.realpath(os.path.join(thisDir, 'data'))
tmpDir = os.path.join(assetDir, 'tmp')
vectorTileDir = os.path.join(assetDir, 'vectorTiles')
os.makedirs(vectorTileDir, exist_ok=True)
os.makedirs(tmpDir, exist_ok=True)


#%%




def downloadAdditionalData():
    downloadFromUrlTo(
        os.path.join(tileMakerDir, 'coastline'),
        'https://osmdata.openstreetmap.de/download/water-polygons-split-4326.zip'
    )


def downloadPbf(dataUrl):
    fileName = urlparse(dataUrl).path.split('/').pop()
    path = os.path.join(tmpDir, fileName)
    if os.path.exists(path):
        print(f"Already downloaded {path}.")
        return path
    response = req.get(dataUrl)
    with open(path, 'wb') as fh:
        fh.write(response.content)
    return path


def pbf2mbt(pbfPath):
    mbtPath = pbfPath.replace('pbf', 'mbtiles')
    if os.path.exists(mbtPath):
        print(f"Already exists: {mbtPath}.")
        if  os.stat(mbtPath).st_size <= 0:
            print(f"Weird: {mbtPath} has size 0. Maybe investigate!")
        return mbtPath
    command = f"{tileMakerDir}/tilemaker --input {pbfPath} --output {mbtPath} --process {tileMakerDir}/config/process-openmaptiles.lua --config {tileMakerDir}/config/config-openmaptiles.json"
    result = os.system(command)
    if result != 0:
        raise Exception(f"Something went wrong trying to execute {command}: {result}")
    return mbtPath


def mbt2xyz(mbtPath, format="pbf"):
    pyramidDir = os.path.join(vectorTileDir, 'xyz')
    if os.path.exists(pyramidDir):
        shu.rmtree(pyramidDir)
    mb.mbtiles_to_disk(mbtPath, pyramidDir, scheme='xyz', format=format)
    return pyramidDir


def copyFonts():
    fontDir = os.path.join(tileMakerDir, 'fonts')
    fontTargetDir = os.path.join(vectorTileDir, 'fonts')
    if os.path.exists(fontTargetDir):
        shu.rmtree(fontTargetDir)
    shu.copytree(fontDir, fontTargetDir, dirs_exist_ok=True)


def copyStyle(style):
    styleFile = os.path.join(tileMakerDir, 'styles', style + '.json')
    shu.copy(styleFile, vectorTileDir)
    return os.path.join(vectorTileDir, style + ".json")


def createVectorTiles(dataUrl, style, hostedAt, format):
    print(f"Downloading {dataUrl} ...")
    pbf = downloadPbf(dataUrl)
    print(f"Converting to mbt ...")
    mbt = pbf2mbt(pbf)
    print(f"Creating pyramid ...")
    pyramidDir = mbt2xyz(mbt, format)
    print(f"Copying fonts ...")
    copyFonts()
    print(f"Copying style: {style} ...")
    newStyleLocation = copyStyle(style)
    replaceInFile(newStyleLocation, r'{{HOSTED_URL}}', hostedAt)
    print("Done!")




    

#%%
if __name__ == '__main__':
    parser = ap.ArgumentParser(description='Downloads OSM data and converts it into vector-tiles')
    parser.add_argument('--data',       required=False, type=str, default="https://download.geofabrik.de/europe/germany/bayern/oberfranken-latest.osm.pbf",   help='Url to pbf files. Example: --data https://download.geofabrik.de/europe/germany/bayern/oberfranken-latest.osm.pbf')
    parser.add_argument('--style',      required=False, type=str, default="basic",                                                                            help='Name of style-file to use. Possible values: basic, 3d, positron, terrain')
    parser.add_argument('--format',     required=False, type=str, default="pbf",                                                                              help='What kind of files to produce. Possible values: pbf, png')
    parser.add_argument('--hosted-at',  required=False, type=str, default="http://localhost:8080/assets/",                                                    help='Under which url will data be hosted? Example: http://localhost:8080/assets/')

    args = parser.parse_args()

    createVectorTiles(args.data, args.style, args.hosted_at, args.format)

