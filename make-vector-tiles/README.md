# README

Much more thorough:
https://github.com/openmaptiles/openmaptiles


# Basic concepts
1. Raw data: 
    - `*.pbf` files
    - osm-data
    - hosted at geofabrik
2. 
    -a) Convert to `*.mbtiles`:
        - mbtiles: a sqlite-db with particular schema
        - convert pbf -> mbtiles: systemed/tilemaker
        - a c++-app, requires glibc to be right version.
    - b) Download mbtiles directly:
        - https://data.maptiler.com/downloads/tileset/osm/europe/germany/bamberg/ <- requires attribution
3. Host
    -a) Convert to pyramid:
        - with mapbox/mbutil
        - python script that reads database and writes out single files in xyz-pyramid
        - files are gzipped by default, need to unzip them first
    -b) Alternatively: host mbtiles directly:
        - https://www.maptiler.com/server/download/


# Hosting
As static files from nginx.
Don't forget CORS-settings.

```nginx
events {
    worker_connections 1024;
}
http {
    include mime.types;
    sendfile on;

    server {
        listen 8080;
        listen [::]:8080;

        resolver 127.0.0.11;
        autoindex off;

        server_name _;
        server_tokens off;

        root /app/static;
        gzip_static on;
        add_header Access-Control-Allow-Origin *;
    }
}
```

# Maplibre
Simply reference the `style`-file.
```js
const map = new Map({
    container: 'app',
    style: 'http://localhost:8080/basic.json',
    center: [11.2, 48.2],
    zoom: 9
});
```

# Deckgl
Verified: just use maplibre as the backend.
```js
const map = new Map({
    container: 'app',
    style: 'http://localhost:8080/basic.json',
    center: [11.2, 48.2],
    zoom: 9
});

const deckOverlay = new MapboxOverlay({
  layers
});

map.addControl(deckOverlay);
map.addControl(new mapboxgl.NavigationControl());
```

Not yet verified: maybe one can use a MVTLayer.
