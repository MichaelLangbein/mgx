#%%
import numpy as np
import json
from helpers import readTif, tifGetBbox, saveToTif, makeTransform
from rasterio import CRS
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


def rawDataToLSTAvdanJovanovska(valuesRed, valuesNIR, toaSpectralRadiance, metaData, noDataValue = -9999):

    """
    Convert raw data to land-surface-temperature (LST) in celsius
    
    Based on [Avdan & Jovanovska](https://www.researchgate.net/journal/Journal-of-Sensors-1687-7268/publication/296414003_Algorithm_for_Automated_Mapping_of_Land_Surface_Temperature_Using_LANDSAT_8_Satellite_Data/links/618456aca767a03c14f69ab7/Algorithm-for-Automated-Mapping-of-Land-Surface-Temperature-Using-LANDSAT-8-Satellite-Data.pdf?__cf_chl_rt_tk=e64hIdi4FTDBdxR5Fz0aaWift_OPNow89iJrKJxXOpo-1686654949-0-gaNycGzNEZA)
    https://www.youtube.com/watch?v=FDmYCI_xYlA
    https://cimss.ssec.wisc.edu/rss/geoss/source/RS_Fundamentals_Day1.ppt

    Raw data:
    - Band 4: Red
    - Band 5: NIR
    - Band 6: SWIR-1
    - Band 7: SWIR-2
    - Band 10: Thermal radiance
    """

    noDataMask = (toaSpectralRadiance == noDataValue) | (valuesNIR == noDataValue) | (valuesRed == noDataValue)


    ## Step 1.1: radiance to at-sensor temperature (brightness temperature BT)

    # Brightness Temperature:
    # If the TOA were a black-body, it would have to have this temperature
    # so that the sensor would receive the measured brightness.
    # Obtained using Planck's law, solved for T (see `black_body_temperature`) and calibrated to sensor.

    k1ConstantBand10 = float(metaData["LANDSAT_METADATA_FILE"]["LEVEL1_THERMAL_CONSTANTS"]["K1_CONSTANT_BAND_10"])
    k2ConstantBand10 = float(metaData["LANDSAT_METADATA_FILE"]["LEVEL1_THERMAL_CONSTANTS"]["K2_CONSTANT_BAND_10"])
    toaBrightnessTemperature = k2ConstantBand10 / np.log((k1ConstantBand10 / toaSpectralRadiance) + 1.0)
    toaBrightnessTemperatureCelsius = toaBrightnessTemperature - 273.15
    toaBrightnessTemperatureCelsius = np.where(noDataMask, noDataValue, toaBrightnessTemperatureCelsius)


    ## Step 2.1: calculating NDVI

    # NDVI:
    # -1.0 ... 0.0 :  water
    # -0.1 ... 0.1 :  rock, sand, snow
    #  0.2 ... 0.5 :  grassland, soil, agricultural, light vegetation
    #  0.6 ... 1.0 :  deep vegetation
    # 
    # NDBI:
    # -1.0 ... 0.0 : water
    #  0.0 ... 1.0 : built up 

    ndvi = (valuesNIR - valuesRed) / (valuesNIR + valuesRed)
    ndvi = np.where(noDataMask, ndvi, noDataValue)


    ## Step 2.2: Vegetation proportion
    ndviVegetation = 0.5
    ndviSoil = 0.2
    vegetationProportion = np.power((ndvi - ndviSoil) / (ndviVegetation - ndviSoil), 2)


    ## Step 2.3: Land-surface emissivity
    
    # Emissivity: fraction of actually emmited radiation relative to a black body. (Black bodies have maximum emissivity.)
    # Water and soil have high emissivity, asphalt has low (0.88). See https://en.wikipedia.org/wiki/Emissivity
    # @TODO: also account for asphalt, then?
    # For that you might want to use NDBI https://pro.arcgis.com/en/pro-app/latest/arcpy/spatial-analyst/ndbi.htm
    # NDBI = (SWIR - NIR) / (SWIR + NIR)
    #
    # Note that this is only thermal radiation - but things are also cooled by convection and conduction.
    # However, we only care about current temperature - and that is not influenced by any of the other heat-flows.
    # But a problem that *does* occur here is this:
    # Real objects are not black bodies - they dont absorb all incident radiation. They also reflect some of it.
    # Soil and vegetation are not very reflective - so that's good. Water is, but we can mask it out.
    # But buildings are, and we're mostly interested in those. So some very reflective buildings will send out a lot of radiation,
    # leading us to overestimate their temperature.
    # We can mitigate this, though: just look for pixels with a high whight-light value and filter those out.
    # Wait! No, we can't! Materials that reflect visible light don't neccessarily reflect thermal.

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



def rawDataToLSTwithFixedEmissivity(toaSpectralRadiance, metaData, emissivity = 0.9, noDataValue = -9999):
    """
        - toaSpectralRadiance: [W/m² angle]
        - emissivity:        (https://en.wikipedia.org/wiki/Emissivity)
             - soil:        0.996
             - water:       0.991
             - vegetation:  0.973
             - concrete:    0.91
             - brick:       0.90
             - asphalt:     0.88

        Steps:
            1. toaSpectralRadiance to toaBlackbodyTemperature (aka BrightnessTemperature) with Planck's law
            2. blackBodyTemperature to landSurfaceTemperature

    """

    # Step 1: radiance to at-sensor temperature (brightness temperature BT)
    # Brightness Temperature:
    # If the TOA were a black-body, it would have to have this temperature
    # so that the sensor would receive the measured radiance.
    # Obtained using Planck's law, solved for T (see `black_body_temperature`) and calibrated to sensor.

    k1ConstantBand10 = float(metaData["LANDSAT_METADATA_FILE"]["LEVEL1_THERMAL_CONSTANTS"]["K1_CONSTANT_BAND_10"])
    k2ConstantBand10 = float(metaData["LANDSAT_METADATA_FILE"]["LEVEL1_THERMAL_CONSTANTS"]["K2_CONSTANT_BAND_10"])
    toaBrightnessTemperature = k2ConstantBand10 / np.log((k1ConstantBand10 / toaSpectralRadiance) + 1.0)
    toaBrightnessTemperatureCelsius = toaBrightnessTemperature - 273.15

    # Step 2: black-body-temperature to land-surface-temperature
    buildingEmissivity = 0.9
    emittedRadianceWavelength = 0.000010895     # [m]
    rho = 0.01438                               # [mK]; rho = Planck * light-speed / Boltzmann
    scale = 1.0 + emittedRadianceWavelength * toaBrightnessTemperatureCelsius * np.log(buildingEmissivity)  / rho
    landSurfaceTemperature = toaBrightnessTemperatureCelsius / scale
    landSurfaceTemperature = np.where(toaSpectralRadiance == noDataValue, noDataValue, landSurfaceTemperature)

    return landSurfaceTemperature




def processFileToLST(pathToFile, fileNameBase, aoi):

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

    lst = rawDataToLSTAvdanJovanovska(valuesRed, valuesNIR, toaSpectralRadiance, metaData, noDataValue)
    lstWithNan = np.where(lst == noDataValue, np.nan, lst)

    # adding projection metadata
    imgH, imgW = lst.shape
    transform = makeTransform(imgH, imgW, aoi)
    saveToTif(f"{pathToFile}/lst.tif", lst, CRS.from_epsg(4326), transform, noDataValue)
    lstTif = readTif(f"{pathToFile}/lst.tif")

    return lstWithNan, lstTif




def processFileToBuildingTemperature(pathToFile, fileNameBase, aoi):

    base = f"{pathToFile}/{fileNameBase}"
    # `noDataValue` must not be np.nan, because then `==` doesn't work as expected
    noDataValue = -9999

    metaData                = readMetaData(base + "MTL.json")

    qaPixelFh               = readTif(base + "QA_PIXEL.TIF")
    toaSpectralRadianceFh   = readTif(base + "B10.TIF")
    assert(qaPixelFh.res == toaSpectralRadianceFh.res)

    qaPixelAOI              = tifGetBbox(qaPixelFh, aoi)[0]
    toaSpectralRadianceAOI  = tifGetBbox(toaSpectralRadianceFh, aoi)[0]

    toaSpectralRadianceNoClouds = extractClouds(toaSpectralRadianceAOI, qaPixelAOI, noDataValue)
    # TODO: mask out everything that isn't a building

    # Converting raw scaled sensor-data to spectral radiance [W/m²]
    toaSpectralRadiance = scaleBandData(toaSpectralRadianceNoClouds, 10, metaData)

    # We only care about buildings here, so we need not calculate vegetation-percentage.
    # We can just use buildings' emissivity (0.9).
    # But: buildings reflect light sometimes (glass, solar-pannels, ...)
    # We detect reflection by very high white light and cut it out
    buildingEmissivity = 0.9
    lst = rawDataToLSTwithFixedEmissivity(toaSpectralRadiance, metaData, buildingEmissivity)
    lstWithNan = np.where(lst == noDataValue, np.nan, lst)

    # TODO: are there materials that strongly reflect thermal?
    # If so, detect them and cut them out.
    # Just detecting lots of white light probably doesn't help ...
    # ... mirrors reflect lots of visible light, but not much thermal.
    # So, yes, there are such materials. Aluminum foil reflects thermal. You can place such foil behind your radiator.
    # Snow is, too: that's why it doesn't melt until long in the summer (it also reflects visible, which is why it's white).
    # Thermal does not go through glass, but easily through plastic. Alluminum is a very good IR reflector: https://www.youtube.com/watch?v=baJtBDJDQDQ
    # For now my suspicion is that there is no material on the outside of buildings that reflects heat very strongly... so we can ignore this for now.

    # adding projection metadata
    imgH, imgW = lst.shape
    transform = makeTransform(imgH, imgW, aoi)
    saveToTif(f"{pathToFile}/lst.tif", lst, CRS.from_epsg(4326), transform, noDataValue)
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
