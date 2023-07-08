import './style.css';
import 'ol/ol.css';
import { Map, Overlay, View } from 'ol';
import TileLayer from 'ol/layer/Tile';
import WGLTileLayer from 'ol/layer/WebGLTile';
import OSM from 'ol/source/OSM';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import GeoJSON from 'ol/format/GeoJSON';
import Style from 'ol/style/Style';
import Fill from 'ol/style/Fill';
import { FeatureLike } from 'ol/Feature';
import { GeoTIFF } from 'ol/source';
import vectorData from './buildings_temperature.geo.json';


const appDiv = document.getElementById("app") as HTMLDivElement;
const popupDiv = document.getElementById("popup") as HTMLDivElement;



const baseLayer = new TileLayer({
  source: new OSM({
    // url: "https://tile-{a-c}.openstreetmap.fr/hot/{z}/{x}/{y}.png"
  }),
  className: 'bw',
  opacity: 0.7
});

const cogLayer = new WGLTileLayer({
  source: new GeoTIFF({
    sources: [{ url: "/public/lst_2020-11-17%2010:04:26.7534760Z.tif" }]
  }),
  style: {
    // https://openlayers.org/workshop/en/cog/ndvi.html
    color: [
      'interpolate',
      ['linear'],
      ['band', 1],
      -0.05,  [0, 0, 0],
      0.0,  [125, 125, 125],
      0.05,  [256, 256, 256]
    ]
  },
  opacity: 0.6,
  visible: false
})


const vectorLayer = new VectorLayer({
  source: new VectorSource({
    features: new GeoJSON().readFeatures(vectorData)
  }),
  style: (feature, resolution) => {
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

const layers = [baseLayer, cogLayer, vectorLayer];

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
  const deltaTs = props["temperature"];
  let sum = 0;
  let count = 0;
  for (const [time, values] of Object.entries(deltaTs)) {
      const tMeanInside = (values as any)["tMeanInside"];
      const tMeanOutside = (values as any)["tMeanOutside"];
      if (tMeanInside === "NaN" || tMeanOutside === "NaN") continue;
      const tIn = parseFloat(tMeanInside as string);
      const tOut = parseFloat(tMeanOutside as string);
      const val = tIn - tOut;
      sum += val;
      count += 1;
  }
  const mean = sum / count;
  return mean;
}