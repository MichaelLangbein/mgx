#%%
import numpy as np
import json
from helpers import readTif, tifGetBbox, saveToTif, makeTransform
from inspect import getsourcefile
from os.path import abspath, dirname
import matplotlib.pyplot as plt


def plotHist(data, noDataMask):
    dataWithNan = np.where(noDataMask, np.nan, data)
    plt.hist(dataWithNan.flatten())

def plotImg(data, noDataMask):
    dataWithNan = np.where(noDataMask, np.nan, data)
    plt.imshow(dataWithNan)


def extractClouds(data, qaPixelData, noDataValue = -9999):
    """
    extracts clouds
    https://www.usgs.gov/landsat-missions/landsat-collection-2-quality-assessment-bands
    https://pages.cms.hu-berlin.de/EOL/gcg_eo/02_data_quality.html
    
    I think I can do this with just the L1 QA_PIXEL bands.
    Only take values where QA_PIXEL == 21824
    There should be more information in L2 QA-layers, but those are not always available
    (My suspicion is that landsat only has L2 onver the US)

    @TODO: get data for all confidence intervals, not only 21824
    ```
        code = 0
        code |= 0 << 0  # image data only
        code |= 0 << 1  # no dilated clouds
        code |= 0 << 2  # no cirrus
        code |= 0 << 3  # no cloud
        code |= 0 << 4  # no cloud shadow
        code |= 0 << 5  # no snow
        code |= 1 << 6  # clear sky
        code |= 0 << 7  # no water
    ```
    """

    dataFiltered = np.zeros(data.shape)
    dataFiltered = np.where(qaPixelData == 21824, data, noDataValue)

    return dataFiltered


def readMetaData(pathToMetadataJsonFile):
    fh = open(pathToMetadataJsonFile)
    metadata = json.load(fh)
    return metadata


def scaleBandData(rawData, bandNr, metaData):
    mult = float(metaData["LANDSAT_METADATA_FILE"]["LEVEL1_RADIOMETRIC_RESCALING"][f"RADIANCE_MULT_BAND_{bandNr}"])
    add = float(metaData["LANDSAT_METADATA_FILE"]["LEVEL1_RADIOMETRIC_RESCALING"][f"RADIANCE_ADD_BAND_{bandNr}"])
    return rawData * mult + add



def rawDataToLST(valuesRed, valuesNIR, toaSpectralRadiance, metaData, noDataValue = -9999):

    """
    Convert raw data to land-surface-temperature (LST) in celsius
    
    Based on [Avdan & Jovanovska](https://www.researchgate.net/journal/Journal-of-Sensors-1687-7268/publication/296414003_Algorithm_for_Automated_Mapping_of_Land_Surface_Temperature_Using_LANDSAT_8_Satellite_Data/links/618456aca767a03c14f69ab7/Algorithm-for-Automated-Mapping-of-Land-Surface-Temperature-Using-LANDSAT-8-Satellite-Data.pdf?__cf_chl_rt_tk=e64hIdi4FTDBdxR5Fz0aaWift_OPNow89iJrKJxXOpo-1686654949-0-gaNycGzNEZA)
    
    Raw data:
    - Band 4: Red
    - Band 5: NIR
    - Band 10: Thermal radiance
    """

    noDataMask = (toaSpectralRadiance == noDataValue) | (valuesNIR == noDataValue) | (valuesRed == noDataValue)


    ## Step 1.1: radiance to at-sensor temperature (brightness temperature BT)
    k1ConstantBand10 = float(metaData["LANDSAT_METADATA_FILE"]["LEVEL1_THERMAL_CONSTANTS"]["K1_CONSTANT_BAND_10"])
    k2ConstantBand10 = float(metaData["LANDSAT_METADATA_FILE"]["LEVEL1_THERMAL_CONSTANTS"]["K2_CONSTANT_BAND_10"])
    toaBrightnessTemperature = k2ConstantBand10 / np.log((k1ConstantBand10 / toaSpectralRadiance) + 1.0)
    toaBrightnessTemperatureCelsius = toaBrightnessTemperature - 273.15
    toaBrightnessTemperatureCelsius = np.where(noDataMask, noDataValue, toaBrightnessTemperatureCelsius)


    ## Step 2.1: calculating NDVI
    ndvi = (valuesNIR - valuesRed) / (valuesNIR + valuesRed)
    ndvi = np.where(noDataMask, ndvi, noDataValue)


    ## Step 2.2: Vegetation proportion
    ndviVegetation = 0.5
    ndviSoil = 0.2
    vegetationProportion = np.power((ndvi - ndviSoil) / (ndviVegetation - ndviSoil), 2)


    ## Step 2.3: Land-surface emissivity
    soilEmissivity       = 0.996
    waterEmissivity      = 0.991
    vegetationEmissivity = 0.973
    surfaceRoughness     = 0.005
    landSurfaceEmissivity = np.zeros(ndvi.shape)
    # Probably water
    landSurfaceEmissivity += np.where((ndvi <= 0.0), waterEmissivity, 0)
    # Probably soil
    landSurfaceEmissivity += np.where((0.0 < ndvi) & (ndvi <= ndviSoil), soilEmissivity, 0)
    # Soil/vegetation mixture
    weightedEmissivity = vegetationEmissivity * vegetationProportion + soilEmissivity * (1.0 - vegetationProportion) + surfaceRoughness
    landSurfaceEmissivity += np.where((ndviSoil < ndvi) & (ndvi <= ndviVegetation), weightedEmissivity, 0)
    # Vegetation only
    landSurfaceEmissivity += np.where((ndviVegetation < ndvi), vegetationEmissivity, 0)
    # No data
    landSurfaceEmissivity = np.where(noDataMask, noDataValue, landSurfaceEmissivity)


    # Step 3.1: land-surface-temperature
    emittedRadianceWavelength = 0.000010895     # [m]
    rho = 0.01438                               # [mK]; rho = Planck * light-speed / Boltzmann
    scale = 1.0 + emittedRadianceWavelength * toaBrightnessTemperatureCelsius * np.log(landSurfaceEmissivity)  / rho
    landSurfaceTemperature = toaBrightnessTemperatureCelsius / scale
    landSurfaceTemperature = np.where(noDataMask, noDataValue, landSurfaceTemperature)


    return landSurfaceTemperature


# account for wind

# match to buildings

def processFile(pathToFile, fileNameBase, aoi):

    base = f"{pathToFile}/{fileNameBase}"
    # `noDataValue` must not be np.nan, because then `==` doesn't work as expected
    noDataValue = -9999

    metaData                = readMetaData(base + "MTL.json")

    qaPixelFh               = readTif(base + "QA_PIXEL.TIF")
    valuesRedFh             = readTif(base + "B4.TIF")
    valuesNIRFh             = readTif(base + "B5.TIF")
    toaSpectralRadianceFh   = readTif(base + "B10.TIF")

    assert(qaPixelFh.res == valuesRedFh.res)
    assert(valuesRedFh.res == valuesNIRFh.res)
    assert(valuesNIRFh.res == toaSpectralRadianceFh.res)

    qaPixelAOI              = tifGetBbox(qaPixelFh, aoi)[0]
    valuesRedAOI            = tifGetBbox(valuesRedFh, aoi)[0]
    valuesNIRAOI            = tifGetBbox(valuesNIRFh, aoi)[0]
    toaSpectralRadianceAOI  = tifGetBbox(toaSpectralRadianceFh, aoi)[0]

    valuesRedNoClouds           = extractClouds(valuesRedAOI, qaPixelAOI, noDataValue)
    valuesNIRNoClouds           = extractClouds(valuesNIRAOI, qaPixelAOI, noDataValue)
    toaSpectralRadianceNoClouds = extractClouds(toaSpectralRadianceAOI, qaPixelAOI, noDataValue)

    valuesRed = valuesRedNoClouds  # no need to scale these - only used for ndvi
    valuesNIR = valuesNIRNoClouds  # no need to scale these - only used for ndvi
    toaSpectralRadiance = scaleBandData(toaSpectralRadianceNoClouds, 10, metaData)

    lst = rawDataToLST(valuesRed, valuesNIR, toaSpectralRadiance, metaData, noDataValue)
    lstWithNan = np.where(lst == noDataValue, np.nan, lst)

    # adding projection metadata
    imgH, imgW = lst.shape
    transform = makeTransform(imgH, imgW, aoi)
    saveToTif(f"{pathToFile}/lst.tif", lst, qaPixelFh.crs, transform, noDataValue)
    lstTif = readTif(f"{pathToFile}/lst.tif")

    return lstWithNan, lstTif




# execute

if __name__ == "__main__":
    thisFilePath = dirname(abspath(getsourcefile(lambda:0)))
    pathToFile = f"{thisFilePath}/data/LC08_L1TP_193026_20220803_20220806_02_T1"
    fileNameBase = "LC08_L1TP_193026_20220803_20220806_02_T1_"
    aoi = { "lonMin": 11.214, "latMin": 48.064, "lonMax": 11.338, "latMax": 48.117 }
    lst = processFile(pathToFile, fileNameBase, aoi)

    fig, axes = plt.subplots(1, 2)
    axes[0].imshow(lst)
    axes[1].hist(lst.flatten())
    

# %%
