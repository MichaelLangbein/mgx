from osm import downloadAndSaveOSM
from download import downloadLandsat
from analyze import processFile

bbox = { "lonMin": 11.214, "latMin": 48.064, "lonMax": 11.338, "latMax": 48.117 }
startDate = "2022-01-01"
endDate = "2023-06-01"

# download and save osm
# @TODO: only if not already in db
buildings = downloadAndSaveOSM(bbox, saveToDirPath="./osm", getBuildings=True, getTrees=False, getWater=False)
# ingest into db

# download and save landsat8
ls8files = downloadLandsat(bbox, startDate, endDate, 10, outputDir="./ls8")

for ls8file in ls8files:

    # extract

    
    # analyze landsat8
    lst = processFile(pathExtracted, fileNameBase, bbox)

    # merge buildings with lst

    # ingest into database