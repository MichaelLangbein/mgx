import './style.css';
import 'ol/ol.css';
import { Map, Overlay, View } from 'ol';
import TileLayer from 'ol/layer/Tile';
import OSM from 'ol/source/OSM';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import GeoJSON from 'ol/format/GeoJSON';
import data from './buildings.geo.json';
import Style from 'ol/style/Style';
import Fill from 'ol/style/Fill';
import { FeatureLike } from 'ol/Feature';



const appDiv = document.getElementById("app") as HTMLDivElement;
const popupDiv = document.getElementById("popup") as HTMLDivElement;



const baseLayer = new TileLayer({
  source: new OSM()
});

const vectorLayer = new VectorLayer({
  source: new VectorSource({
    features: new GeoJSON().readFeatures(data)
  }),
  style: (feature, resoltion) => {
    const mean = featureMeanDeltaT(feature);

    const maxVal = 2.0;
    const minVal = -2.0;
    const frac = (mean - minVal) / (maxVal - minVal);

    return new Style({
      fill: new Fill({
        color: `rgb(${256 * frac}, ${256 * (1-frac)}, 0.1)`
      })
    })
  }
})

const layers = [baseLayer, vectorLayer];

const view = new View({
  center: [11.3, 48.08],
  zoom: 14,
  projection: 'EPSG:4326'
});

const popupOverlay = new Overlay({
  element: popupDiv
});

const overlays = [popupOverlay];

const map = new Map({
  view, layers, overlays, target: appDiv
});


map.on("click", (evt) => {

  
  const location = evt.coordinate;
  const features = vectorLayer.getSource()?.getFeaturesAtCoordinate(location);

  if (features && features?.length > 0) {
    const mean = featureMeanDeltaT(features[0]);
    popupOverlay.setPosition(location);
    popupDiv.innerHTML = `<div><p>Delta T (mean): ${mean.toFixed(2)} °C</p></div>`;
  } else {
    popupOverlay.setPosition(undefined);
  }
});


function featureMeanDeltaT(feature: FeatureLike) {
  const props = feature.getProperties();
  const deltaTs = props["deltaTs"];
  let sum = 0;
  let count = 0;
  for (const [key, value] of Object.entries(deltaTs)) {
    if (value && value !== "") {
      const val = parseFloat(value as string);
      sum += val;
      count += 1;
    }
  }
  const mean = sum / count;
  return mean;
}