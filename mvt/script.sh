#! /bin/bash

wget https://github.com/systemed/tilemaker/releases/download/v2.3.0/tilemaker-ubuntu-22.04.zip
unzip tilemaker-ubuntu-22.04.zip
rm tilemaker-ubuntu-22.04.zip 
rm -r resources
mv build tilemaker
cp configs/config tilemaker
cp configs/styles tilemaker

git clone https://github.com/klokantech/klokantech-gl-fonts tilemaker/fonts

wget https://osmdata.openstreetmap.de/download/water-polygons-split-4326.zip
unzip water-polygons-split-4326.zip
rm water-polygons-split-4326.zip
mv water-polygons-split-4326 tilemaker/shapefiles/coastline

#wget https://github.com/nvkelso/natural-earth-vector/archive/refs/tags/v5.1.2.zip
unzip v5.1.2.zip
rm v5.1.2.zip
mv natural-earth-vector-5.1.2/10m_cultural/ne_10m_urban_areas*                  tilemaker/shapefiles/landcover/ne_10m_urban_areas
mv natural-earth-vector-5.1.2/10m_physical/ne_10m_antarctic_ice_shelves_polys.* tilemaker/shapefiles/landcover/ne_10m_antarctic_ice_shelves_polys
mv natural-earth-vector-5.1.2/10m_physical/ne_10m_glaciated_areas.*             tilemaker/shapefiles/landcover/ne_10m_glaciated_areas
rm -r natural-earth-vector-5.1.2