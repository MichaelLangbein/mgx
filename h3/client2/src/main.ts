import './style.css';
import 'chartjs-adapter-moment';
import 'ol/ol.css';
import { Chart } from 'chart.js/auto';
import { colorScale } from './graph';
import { FeatureLike } from 'ol/Feature';
import { fromLonLat } from 'ol/proj';
import { Map, Overlay, View } from 'ol';
import data from './buildings_analyzed.geo.json';
import Fill from 'ol/style/Fill';
import GeoJSON from 'ol/format/GeoJSON';
import Style from 'ol/style/Style';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import TileLayer from 'ol/layer/Tile';
import OSM from 'ol/source/OSM';
import Layer from 'ol/layer/Layer';
import TileWMS from 'ol/source/TileWMS';
import TileSource from 'ol/source/Tile';
// import VectorTileLayer from 'ol/layer/VectorTile';
// import VectorTile from 'ol/source/VectorTile';
// import TopoJSON from 'ol/format/TopoJSON';


const mapProjection = 'EPSG:3857';


// const baseLayer = new VectorTileLayer({
//   source: new VectorTile({
//     // url: "http://localhost:5173/public/vectorTiles/basic.json",
//     url: "http://localhost:5173/public/vectorTiles/{z}/{x}/{y}.pbf?flipy=true",
//     format: new TopoJSON(),
//   }),
//   style: 
// });

const baseLayer = new TileLayer({
  source: new OSM()
});

// function greyscale(context: any) {
//   var canvas = context.canvas;
//   var width = canvas.width;
//   var height = canvas.height;var imageData = context.getImageData(0, 0, width, height);
//   var data = imageData.data;
//   for(let i=0; i<data.length; i += 4){
//    var r = data[i];
//    var g = data[i + 1];
//    var b = data[i + 2];
//    // CIE luminance for the RGB
//    var v = 0.2126 * r + 0.7152 * g + 0.0722 * b;
//    // Show white color instead of black color while loading new tiles:
//    if(v === 0.0) v=255.0;  
//    data[i+0] = v; // Red
//    data[i+1] = v; // Green
//    data[i+2] = v; // Blue
//    data[i+3] = 125; // Alpha
//   }
//   context.putImageData(imageData,0,0);
// }

// baseLayer.on('postrender', (event) => {
//   greyscale(event.context);
// });



const layerNames = ["ls8:lst-2020-11-17", "ls8:lst-2020-12-03", "ls8:lst-2020-12-19", "ls8:lst-2021-01-04", "ls8:lst-2021-01-20", "ls8:lst-2021-02-05", "ls8:lst-2021-02-21", "ls8:lst-2021-11-20", "ls8:lst-2021-12-14", "ls8:lst-2021-12-21", "ls8:lst-2021-12-22", "ls8:lst-2022-01-07", "ls8:lst-2022-01-15", "ls8:lst-2022-01-23", "ls8:lst-2022-02-24", "ls8:lst-2022-08-03", "ls8:lst-2022-10-06", "ls8:lst_2022-08-03"];
const rasterLayers: Layer[] = [];
for (const layerName of layerNames) {
  rasterLayers.push(new TileLayer({
    source: new TileWMS({
      url: "http://localhost:8080/geoserver/ls8/wms",
      params: {
        "LAYERS": layerName,
        "STYLES": "thermal"
      },
      serverType: 'geoserver'
    })
  }))
}


const vectorData = new VectorLayer({
  source: new VectorSource({
    features: new GeoJSON({ featureProjection: mapProjection }).readFeatures(data),
  }),
  style: (feature) => {
    const timeSeries = getTimeSeries(feature);

    const {r, g, b} = colorScale(timeSeries);

    return new Style({
      fill: new Fill({
        color: `rgb(${r}, ${g}, ${b})`
      })
    })
  }
});

const layers = [baseLayer, ...rasterLayers, vectorData];


const view = new View({
  center: fromLonLat([11.3, 48.08], mapProjection),
  zoom: 13,
  projection: mapProjection
});


const popup = new Overlay({
  element: document.getElementById("popup")!,
});

const overlays = [popup];

const target = document.getElementById("app")!;

const map = new Map({
  layers, target, view, overlays
});


map.on("click", (event) => {
  const coords = event.coordinate;
  let foundFeature = false;
  vectorData.getSource()?.forEachFeatureAtCoordinateDirect(coords, (feature) => {
    foundFeature = true;
    popup.setPosition(coords);
    const element = popup.getElement();
    if (element) createPlot(element, feature);
  });
  if (!foundFeature) popup.setPosition(undefined);
});


function createPlot(element: HTMLElement, feature: FeatureLike) {

  element.innerHTML = "";
  const canvas = document.createElement('canvas');
  element.appendChild(canvas);

  const timeSeries = getTimeSeries(feature);

  new Chart(canvas, {
    type: 'bar',
    data: {
      datasets: [{
        label: 'Temperature',
        data: timeSeries.map(e => ({x: e.date.toISOString(), y: e.value})),
        borderWidth: 1
      }]
    },
    options: {
      scales: {
        x: {
          type: 'time',
          time: {
            unit: 'month'
          }
        },
        y: {
          beginAtZero: true
        }
      }
    }
  });
}


function getTimeSeries(feature: FeatureLike) {

  const props = feature.getProperties();
  const timeSeriesData = props["timeseries"];
  if (!timeSeriesData) return [];
  
  const timeSeries: {date: Date, value: number}[] = [];
  for (const [key, value] of Object.entries(timeSeriesData)) {
    if (value !== -9999) {
      timeSeries.push({
        date: new Date(`${key.slice(0, 4)}-${key.slice(4, 6)}-${key.slice(6, 8)}`),
        value: +(value as string)
      })
    }
  }
  
  return timeSeries;
}

