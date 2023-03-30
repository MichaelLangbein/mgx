import './style.css';
import { Deck } from '@deck.gl/core/typed';
import { MVTLayer } from '@deck.gl/geo-layers/typed';
import { H3HexagonLayer } from '@deck.gl/geo-layers/typed';


/**
 * Section 1: data
 */


const response = await fetch('http://localhost:5000/getData?resolution=8&bbox=11.35,48.03,11.81,48.20');
const data = await response.json();
console.log(data);

/**
 * Section 2: display
 */

// https://deck.gl/docs/api-reference/geo-layers/mvt-layer
const baseLayer = new MVTLayer({
  id: 'base',
  data: "https://a.tiles.geoservice.dlr.de/service/tms/1.0.0/planet_eoc@EPSG%3A4326@pbf/{z}/{x}/{y}.pbf?flipy=true"
});


const hexLayer = new H3HexagonLayer({
  id: 'heat',
  data: data,
  pickable: true,
  wireframe: false,
  filled: true,
  extruded: true,
  getHexagon: d => d[1],
  getFillColor: d => [255 * (d[3] - 6200) / 1000, 125, 0],
  getElevation: d => (d[3] - 6400) / 1000,
  elevationScale: 2000,
  opacity: 0.6
});

const layers = [baseLayer, hexLayer];

const initialViewState = {
  latitude: 48.1,
  longitude: 11.5,
  zoom: 10
};

const deckgl = new Deck({
  initialViewState,
  controller: true,
  layers,
});