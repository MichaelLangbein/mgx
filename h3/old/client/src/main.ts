import './style.css';
import { Map, NavigationControl } from 'maplibre-gl';
import { MapboxOverlay } from '@deck.gl/mapbox/typed';
import { HeatmapLayer } from '@deck.gl/aggregation-layers/typed';
import { H3HexagonLayer } from '@deck.gl/geo-layers/typed';


const response = await fetch('http://localhost:5000/getData?resolution=8&bbox=11.35,48.03,11.81,48.20');
const data = await response.json();

const response2 = await fetch('http://localhost:5000/getResolved?resolution=10&bbox=11.35,48.03,11.81,48.20');
const data2 = await response2.json();

const map = new Map({
    container: 'app',
    style: 'http://localhost:8080/basic.json',
    center: [11.2, 48.2],
    zoom: 9,
});

map.on('zoomend', async (evt) => {
    const zoom = map.getZoom();
    const center = map.getCenter();
    const response = await fetch(`http://localhost:5000/getData?resolution=${zoom}&bbox=11.35,48.03,11.81,48.20`);
    const data = await response.json();
    console.log(data)
})


const hexLayer = new H3HexagonLayer({
    id: 'heathex',
    data: data,
    pickable: true,
    wireframe: false,
    filled: true,
    extruded: true,
    getHexagon: d => d[1],
    getFillColor: d => [255 * (d[3] - 6200) / 1000, 125, 0],
    getElevation: d => (d[3] - 6400) / 1000,
    elevationScale: 5000,
    opacity: 1.0
});

const heatLayer = new HeatmapLayer({
    id: 'heatmap',
    data: data,
    getPosition: d => [d.coords[1], d.coords[0]],
    getWeight: d => (d.value - 6400) / 1000,
    aggregation: 'MEAN',
    radiusPixels: 100,
    opacity: 0.1
});

const layers = [
    // heatLayer
    hexLayer
];

const deckOverlay = new MapboxOverlay({
    layers,
});


// @ts-ignore
map.addControl(deckOverlay);
map.addControl(new NavigationControl({}));