#! /bin/bash

mkdir ./tilemaker
mkdir ./tilemaker/shapefiles
mkdir ./tilemaker/shapefiles/coastline
mkdir ./tilemaker/shapefiles/landcover
mkdir ./tilemaker/shapefiles/landcover/ne_10m_urban_areas
mkdir ./tilemaker/shapefiles/landcover/ne_10m_antarctic_ice_shelves_polys
mkdir ./tilemaker/shapefiles/landcover/ne_10m_glaciated_areas


# getting tilemaker binary
wget https://github.com/systemed/tilemaker/releases/download/v2.3.0/tilemaker-ubuntu-22.04.zip
unzip tilemaker-ubuntu-22.04.zip
rm tilemaker-ubuntu-22.04.zip 
rm -r resources
mv build/tilemaker ./tilemaker/


# copying over configuration
cp -r configs/config ./tilemaker
cp -r configs/styles ./tilemaker


# getting fonts
git clone https://github.com/klokantech/klokantech-gl-fonts ./tilemaker/fonts


# getting water polygons
wget https://osmdata.openstreetmap.de/download/water-polygons-split-4326.zip
unzip water-polygons-split-4326.zip
mv water-polygons-split-4326 ./tilemaker/shapefiles/coastline
rm water-polygons-split-4326.zip


# getting other shapefiles
wget https://github.com/nvkelso/natural-earth-vector/archive/refs/tags/v5.1.2.zip
unzip v5.1.2.zip
rm v5.1.2.zip
mv natural-earth-vector-5.1.2/10m_cultural/ne_10m_urban_areas*                  ./tilemaker/shapefiles/landcover/ne_10m_urban_areas
mv natural-earth-vector-5.1.2/10m_physical/ne_10m_antarctic_ice_shelves_polys.* ./tilemaker/shapefiles/landcover/ne_10m_antarctic_ice_shelves_polys
mv natural-earth-vector-5.1.2/10m_physical/ne_10m_glaciated_areas.*             ./tilemaker/shapefiles/landcover/ne_10m_glaciated_areas
rm -r natural-earth-vector-5.1.2


# getting mbutils
git clone https://github.com/mapbox/mbutil.git
mv mbutil/mbutil/util.py ./mbutil.py
rm -rf mbutil

python osm_to_vectortiles.py --data https://download.geofabrik.de/europe/germany/bayern/oberfranken-latest.osm.pbf --style basic --hosted-at http://localhost:8080/assets/
