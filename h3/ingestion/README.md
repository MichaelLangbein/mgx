# Data sources

S8 from earth-explorer

Alternatively, download from stac: https://collections.eurodatacube.com/landsat-8-l2/
Or maybe from here: https://radiantearth.github.io/stac-browser/#/search/external/landsatlook.usgs.gov/stac-server/


My suspicion is that landsat only has L2 onver the US.
Indeed, over Europe I can only find L1 data.
I think that thermal data in L1 is radiance, not land-surface-temperature (LST).
To calculate LST is a bit complicated - see https://custom-scripts.sentinel-hub.com/landsat-8/land_surface_temperature_mapping/


Alternatively use copernicus data:
https://land.copernicus.eu/global/products/lst
Provides LST, but only at 5km resolution.

# Analyze
This seems to be a good source for calculations:
https://custom-scripts.sentinel-hub.com/landsat-8/land_surface_temperature_mapping/



## Emissivity