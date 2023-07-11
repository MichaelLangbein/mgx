#! /bin/bash

# conda activate geo
cd ../make-vector-tiles
./script.sh
cp ./data ../h3
cd ../h3
docker compose up
cd ./ingestion
python main.py
cd ../client
npm ci
npm run dev