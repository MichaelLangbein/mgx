import { Map, View } from 'ol';
import { Layer, Tile as TileLayer } from 'ol/layer';
import { OSM } from 'ol/source';


const canvas = document.getElementById('canvas') as HTMLCanvasElement;


const data = {};


const osm = new TileLayer({
    source: new OSM()
});

const layers = [osm];

const view = new View({
    center: [15, 45],
    zoom: 7,
    projection: 'EPSG:4326'
});

const map = new Map({
    target: canvas,
    layers, view
})
