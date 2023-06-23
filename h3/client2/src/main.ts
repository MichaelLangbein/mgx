import './style.css';
import 'ol/ol.css';
import TileLayer from 'ol/layer/Tile';
import { Map, Overlay, View } from 'ol';
import OSM from 'ol/source/OSM';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import GeoJSON from 'ol/format/GeoJSON';
import data from './buildings_analyzed.geo.json';
import { Chart } from 'chart.js/auto';
import 'chartjs-adapter-moment';
import { FeatureLike } from 'ol/Feature';
import Style from 'ol/style/Style';
import Fill from 'ol/style/Fill';
import * as d3color from 'd3-color';


const baseLayer = new TileLayer({
  source: new OSM()
});

function greyscale(context: any) {
  var canvas = context.canvas;
  var width = canvas.width;
  var height = canvas.height;var imageData = context.getImageData(0, 0, width, height);
  var data = imageData.data;
  for(let i=0; i<data.length; i += 4){
   var r = data[i];
   var g = data[i + 1];
   var b = data[i + 2];
   // CIE luminance for the RGB
   var v = 0.2126 * r + 0.7152 * g + 0.0722 * b;
   // Show white color instead of black color while loading new tiles:
   if(v === 0.0) v=255.0;  
   data[i+0] = v; // Red
   data[i+1] = v; // Green
   data[i+2] = v; // Blue
   data[i+3] = 125; // Alpha
  }
  context.putImageData(imageData,0,0);
}

baseLayer.on('postrender', (event) => {
  greyscale(event.context);
})

const dataLayer = new VectorLayer({
  source: new VectorSource({
    features: new GeoJSON().readFeatures(data),
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

const layers = [baseLayer, dataLayer];

const view = new View({
  center: [11.3, 48.08],
  zoom: 13,
  projection: 'EPSG:4326'
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
  dataLayer.getSource()?.forEachFeatureAtCoordinateDirect(coords, (feature) => {
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

function colorScale(timeSeries: { date: Date; value: number; }[]): { r: any; g: any; b: any; } {
  
  const meanTemperature = timeSeries
      .map(d => d.value)
      .reduce((carry, current) => carry + current, 0)
      / timeSeries.length;

  const [r, g, b] = greenVioletRangeStepwise(0, 50, meanTemperature);

  return {r, g, b};
}



function greenVioletRangeStepwise(startVal: number, endVal: number, currentVal: number): [number, number, number] {
  const degree = fraction(currentVal, startVal, endVal);
  const rgb = scaleInterpolation(violetGreenScale2, 1.0 - degree, false);
  return rgb;
}

function fraction(val: number, start: number, end: number, minDistance = 0.0000001): number {
  if (Math.abs(end - start) < minDistance) {
    console.warn(`Trying to calculate a fraction with start- and end-point very close to each other: ${end} - ${start} = ${end - start}`);
    return 0.0; // by l'Hospital
  }
  return (val - start) / (end - start);
}

function scaleInterpolation(scale: Scale, value: number, smooth = true): [number, number, number] {
  const keys = Object.keys(scale).map(k => +k).sort();  // js-objects dont keep the ordering of numeric keys as they were entered. instead it goes: integers, strings, decimals, each group sorted by first appearance, not value.
  const colors = keys.map(k => scale[k]);
  const nrKeys =  keys.length;
  if (value < keys[0]) {
    return colors[0];
  }
  for (let i = 0; i < nrKeys; i++) { 
    const startKey = keys[i];
    const endKey = keys[i+1];
    if (startKey <= value && value < endKey) {
      if (!smooth) {
        return colors[i];
      }
      const degree = fraction(value, startKey, endKey);
      const startColorRGB = colors[i];
      const endColorRGB = colors[i+1];
      const startColorHSL = d3color.hsl(d3color.rgb(... startColorRGB));
      const endColorHSL = d3color.hsl(d3color.rgb(... endColorRGB));
      const h = linInterpolate(startColorHSL.h, endColorHSL.h, degree);
      const s = linInterpolate(startColorHSL.s, endColorHSL.s, degree);
      const l = linInterpolate(startColorHSL.l, endColorHSL.l, degree);
      const rgb = d3color.rgb(d3color.hsl(h, s, l));
      return [Math.round(rgb.r), Math.round(rgb.g), Math.round(rgb.b)];
    }
  }
  return colors[nrKeys - 1];
}

function linInterpolate(startVal: number, endVal: number, degree: number): number {
  const degreeClamped = Math.max(Math.min(degree, 1), 0);
  const interpolated = degreeClamped * (endVal - startVal) + startVal;
  return interpolated;
}

interface Scale {
  [key: string]: [number, number, number];
}

const violetGreenScale2: Scale = {
  0.2: [184, 53, 131],
  0.35: [213, 62, 79],
  0.5: [252, 141, 89],
  0.7: [254, 224, 139],
  0.8: [230, 245, 152],
  0.9: [153, 213, 148],
};