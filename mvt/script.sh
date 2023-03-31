#! /bin/bash


# making sure glibc 2.32 - 2.34 is installed


# creating required directories
mkdir ./processing
mkdir ./processing/shapefiles
mkdir ./processing/shapefiles/coastline
mkdir ./processing/shapefiles/landcover
mkdir ./processing/shapefiles/landcover/ne_10m_urban_areas
mkdir ./processing/shapefiles/landcover/ne_10m_antarctic_ice_shelves_polys
mkdir ./processing/shapefiles/landcover/ne_10m_glaciated_areas


# getting tilemaker binary
# wget https://github.com/systemed/tilemaker/releases/download/v2.3.0/tilemaker-ubuntu-22.04.zip <-- requires glibc 2.32
wget https://github.com/systemed/tilemaker/releases/download/v2.2.0/tilemaker-ubuntu-18.04.zip
unzip tilemaker-ubuntu-22.04.zip
rm tilemaker-ubuntu-22.04.zip 
rm -r resources
mv build/tilemaker ./processing/
chmod +x ./processing/tilemaker
rm -r build


# copying over configuration
cp -r configs/config ./processing
cp -r configs/styles ./processing


# getting fonts
git clone https://github.com/klokantech/klokantech-gl-fonts ./processing/fonts


# getting water polygons
wget https://osmdata.openstreetmap.de/download/water-polygons-split-4326.zip
unzip water-polygons-split-4326.zip
mv water-polygons-split-4326/* ./processing/shapefiles/coastline
rm water-polygons-split-4326.zip


# getting other shapefiles
wget https://github.com/nvkelso/natural-earth-vector/archive/refs/tags/v5.1.2.zip
unzip v5.1.2.zip
rm v5.1.2.zip
mv natural-earth-vector-5.1.2/10m_cultural/ne_10m_urban_areas*                  ./processing/shapefiles/landcover/ne_10m_urban_areas
mv natural-earth-vector-5.1.2/10m_physical/ne_10m_antarctic_ice_shelves_polys.* ./processing/shapefiles/landcover/ne_10m_antarctic_ice_shelves_polys
mv natural-earth-vector-5.1.2/10m_physical/ne_10m_glaciated_areas.*             ./processing/shapefiles/landcover/ne_10m_glaciated_areas
rm -r natural-earth-vector-5.1.2


# getting mbutils
git clone https://github.com/mapbox/mbutil.git
mv mbutil/mbutil/util.py ./mbutil.py
rm -rf mbutil

python osm_to_vectortiles.py --data https://download.geofabrik.de/europe/germany/bayern/oberfranken-latest.osm.pbf --style basic --hosted-at http://localhost:8080/assets/
