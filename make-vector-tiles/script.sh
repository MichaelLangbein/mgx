#! /bin/bash
set -x           # for debugging only: print out current line before executing it
set -o errexit   # abort on nonzero exitstatus
set -o nounset   # abort on unbound variable
set -o pipefail  # don't hide errors within pipes


# making sure glibc 2.32 - 2.34 is installed


# creating required directories
mkdir -p ./processing
mkdir -p ./processing/shapefiles
mkdir -p ./processing/shapefiles/coastline
mkdir -p ./processing/shapefiles/landcover
mkdir -p ./processing/shapefiles/landcover/ne_10m_urban_areas
mkdir -p ./processing/shapefiles/landcover/ne_10m_antarctic_ice_shelves_polys
mkdir -p ./processing/shapefiles/landcover/ne_10m_glaciated_areas


# getting tilemaker binary
if [ ! -f ./processing/tilemaker ]; then
    # wget https://github.com/systemed/tilemaker/releases/download/v2.3.0/tilemaker-ubuntu-22.04.zip <-- requires glibc 2.32
    wget https://github.com/systemed/tilemaker/releases/download/v2.2.0/tilemaker-ubuntu-18.04.zip
    unzip tilemaker-ubuntu-18.04.zip
    rm tilemaker-ubuntu-18.04.zip 
    rm -r resources
    mv build/tilemaker ./processing/
    chmod +x ./processing/tilemaker
    rm -r build
fi


# copying over configuration
cp -r configs/config ./processing
cp -r configs/styles ./processing


# getting fonts
if [ ! -d ./processing/fonts ]; then
    git clone https://github.com/klokantech/klokantech-gl-fonts ./processing/fonts
fi


# getting water polygons
if [ ! -f ./processing/shapefiles/coastline/water_polygons.shp ]; then
    wget https://osmdata.openstreetmap.de/download/water-polygons-split-4326.zip
    unzip water-polygons-split-4326.zip
    mv water-polygons-split-4326/* ./processing/shapefiles/coastline
    rm water-polygons-split-4326.zip
fi


# getting other shapefiles
if [ ! -f ./processing/shapefiles/landcover/ne_10m_urban_areas/ne_10m_urban_areas_landscan.shp ]; then 
    wget https://github.com/nvkelso/natural-earth-vector/archive/refs/tags/v5.1.2.zip
    unzip v5.1.2.zip
    rm v5.1.2.zip
    mv natural-earth-vector-5.1.2/10m_cultural/ne_10m_urban_areas*                  ./processing/shapefiles/landcover/ne_10m_urban_areas
    mv natural-earth-vector-5.1.2/10m_physical/ne_10m_antarctic_ice_shelves_polys.* ./processing/shapefiles/landcover/ne_10m_antarctic_ice_shelves_polys
    mv natural-earth-vector-5.1.2/10m_physical/ne_10m_glaciated_areas.*             ./processing/shapefiles/landcover/ne_10m_glaciated_areas
    rm -r natural-earth-vector-5.1.2
fi


# getting mbutils
if [ ! -f ./mbutil.py ]; then
    git clone https://github.com/mapbox/mbutil.git
    mv mbutil/mbutil/util.py ./mbutil.py
    rm -rf mbutil
fi

python osm_to_vectortiles.py --data https://download.geofabrik.de/europe/germany/bayern/oberbayern-latest.osm.pbf --style basic --hosted-at http://localhost:8080/assets/
