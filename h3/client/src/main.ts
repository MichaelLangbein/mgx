import './style.css';
import { Deck } from '@deck.gl/core/typed';
import { MVTLayer, _WMSLayer } from '@deck.gl/geo-layers/typed';
import { HeatmapLayer } from '@deck.gl/aggregation-layers/typed';
import { H3HexagonLayer } from '@deck.gl/geo-layers/typed';


/**
 * Section 1: data
 */


const response = await fetch('http://localhost:5000/getData?resolution=8&bbox=11.35,48.03,11.81,48.20');
const data = await response.json();

const response2 = await fetch('http://localhost:5000/getResolved?resolution=10&bbox=11.35,48.03,11.81,48.20');
const data2 = await response2.json();



/**
 * Section 2: display
 */

// // https://deck.gl/docs/api-reference/geo-layers/mvt-layer
// const baseLayer = new MVTLayer({
//   id: 'base',
//   data: "https://a.tiles.geoservice.dlr.de/service/tms/1.0.0/planet_eoc@EPSG%3A4326@pbf/{z}/{x}/{y}.pbf?flipy=true"
// });

const baseLayer = new _WMSLayer({
  id: 'base',
  data: 'https://ows.terrestris.de/osm/service',
  serviceType: 'wms',
  layers: ['OSM-WMS']
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
  elevationScale: 5000,
  opacity: 0.5
});

const heatLayer = new HeatmapLayer({
  id: 'heatmap',
  data: data2,
  getPosition: d => [d.coords[1], d.coords[0]],
  getWeight: d => (d.value - 6400) / 1000,
  aggregation: 'MEAN',
  radiusPixels: 100,
  opacity: 0.3
});

const layers = [
  baseLayer, 
  heatLayer
];

const initialViewState = {
  latitude: 48.1,
  longitude: 11.5,
  zoom: 10
};

const deckgl = new Deck({
  initialViewState,
  controller: true,
  layers,
  onViewStateChange: ({viewState, oldViewState, interactionState, viewId}) => {
    console.log(viewState.zoom)
  }
});
