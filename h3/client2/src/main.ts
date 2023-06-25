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


// import TileSource from 'ol/source/Tile';
// import VectorTileLayer from 'ol/layer/VectorTile';
// import VectorTile from 'ol/source/VectorTile';
// import TopoJSON from 'ol/format/TopoJSON';
// const baseLayer = new VectorTileLayer({
//   source: new VectorTile({
//     // url: "http://localhost:5173/public/vectorTiles/basic.json",
//     url: "http://localhost:5173/public/vectorTiles/{z}/{x}/{y}.pbf?flipy=true",
//     format: new TopoJSON(),
//   }),
//   style: 
// });


const mapProjection = 'EPSG:3857';

const timeSteps = ["2020-11-17", "2020-12-03", "2020-12-19", "2021-01-04", "2021-01-20", "2021-02-05", "2021-02-21", "2021-11-20", "2021-12-14", "2021-12-21", "2021-12-22", "2022-01-07", "2022-01-15", "2022-01-23", "2022-02-24", "2022-08-03", "2022-10-06", "2022-08-03"];

const baseLayer = new TileLayer({
  source: new OSM()
});



const rasterLayers: Layer[] = [];
for (const timeStep of timeSteps) {
  const layer = new TileLayer({
    source: new TileWMS({
      url: "http://localhost:8080/geoserver/ls8/wms",
      params: {
        "LAYERS": `ls8:lst-${timeStep}`,
        "STYLES": "thermal"
      },
      serverType: 'geoserver'
    })
  });
  layer.set("timeStep", timeStep);
  rasterLayers.push(layer);
}


const vectorData = new VectorLayer({
  source: new VectorSource({
    features: new GeoJSON({ featureProjection: mapProjection }).readFeatures(data),
  })
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


newTimestep(timeSteps[0]);

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
  
  const timeSeries: {date: string, value: number}[] = [];
  for (const [key, value] of Object.entries(timeSeriesData)) {
    if (value !== -9999) {
      timeSeries.push({
        date: `${key.slice(0, 4)}-${key.slice(4, 6)}-${key.slice(6, 8)}`, // new Date(`${key.slice(0, 4)}-${key.slice(4, 6)}-${key.slice(6, 8)}`),
        value: +(value as string)
      })
    }
  }
  
  return timeSeries;
}

function newTimestep(newTimeStep: string) {
  if (!timeSteps.includes(newTimeStep)) throw Error(`invalid timestep: ${newTimeStep}`);

  for (const layer of rasterLayers) {
    const timeStep = layer.get("timeStep");
    if (newTimeStep === timeStep) layer.setOpacity(1.0);
    else layer.setOpacity(0.0);    
  }

  vectorData.setStyle((feature) => {
    const timeSeries = getTimeSeries(feature);
    const currentValue = timeSeries.find(d => d.date === newTimeStep);

    let color = `rgb(125, 125, 125)`;
    if (currentValue) {
      const {r, g, b} = colorScale(currentValue!.value);
      color = `rgb(${r}, ${g}, ${b})`;
    }

    return new Style({
      fill: new Fill({
        color
      })
    })
  })

}