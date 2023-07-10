import './style.css';
import 'ol/ol.css';
import { Map, MapBrowserEvent, Overlay, View } from 'ol';
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
import { colorScale } from './graph';
import { Datum, barchart } from './barchart';

// const timeSeries: Datum[] = [
//   { label: 'a', value: -4 },
//   { label: 'b', value: 0.5 },
//   { label: 'c', value: 2 }
// ]
// const pop = document.getElementById('pop') as HTMLDivElement;
// barchart().container(pop).width(400).height(300).data(timeSeries).xlabel('time').ylabel('delta T').hlines([{label: '-2.1', value: -2.1}, {label: 'other', value: 1.0}])();




/**********************************************
 *   STATE
 *********************************************/

interface State {
  mode: 'mean' | 'time',
  currentTime: string,
  availableTimes: string[],
  clickedFeature: FeatureLike | undefined
}

const state: State = {
  mode: 'mean',
  currentTime: '2020-11-17 10:04:26.7534760Z',
  availableTimes: [
    "2020-11-17 10:04:26.7534760Z",
    // "2020-12-03 10:04:30.0526110Z",
    "2020-12-19 10:04:29.0548320Z",
    "2021-01-04 10:04:24.4138260Z",
    // "2021-01-20 10:04:17.4570379Z",
    // "2021-02-05 10:04:15.9847940Z",
    // "2021-02-21 10:03:47.5687389Z",
    "2021-02-21 10:04:11.4555430Z",
    // "2021-11-20 10:04:29.0843560Z",
    // "2021-12-14 10:04:26.7646900Z",
    // "2021-12-22 10:04:03.7751530Z",
    // "2021-12-22 10:04:27.6577210Z",
    // "2022-01-07 10:04:23.4671659Z",
    "2022-01-15 10:04:23.2404300Z",
    // "2022-01-23 10:04:19.2682800Z",
    // "2022-02-24 10:03:46.7479169Z",
    // "2022-02-24 10:04:10.6220130Z",
    // "2022-08-03 10:04:11.7338470Z",
    "2022-08-03 10:04:35.6121790Z",
    "2022-10-06 10:04:44.6235710Z",
  ],
  clickedFeature: undefined
};

/**********************************************
 *   INTERACTIVE COMPONENTS
 *********************************************/


const appDiv                    = document.getElementById("app") as HTMLDivElement;
const popupDiv                  = document.getElementById("popup") as HTMLDivElement;
const meanDiv                   = document.getElementById("modeSelectMean") as HTMLDivElement;
const timeDiv                   = document.getElementById("modeSelectTime") as HTMLDivElement;
const meanModeSelectInput       = document.getElementById("meanModeSelectInput") as HTMLInputElement;
const timeModeSelectInput       = document.getElementById("timeModeSelectInput") as HTMLInputElement;
const timeControlBackDiv        = document.getElementById("timeControlBack") as HTMLDivElement;
const timeControlCurrentTimeDiv = document.getElementById("timeControlCurrentTime") as HTMLDivElement;
const timeControlForwardDiv     = document.getElementById("timeControlForward") as HTMLDivElement;


/**********************************************
 *   SETUP
 *********************************************/


const baseLayer = new TileLayer({
  source: new OSM({
    // url: "https://tile-{a-c}.openstreetmap.fr/hot/{z}/{x}/{y}.png"
  }),
  className: 'bw',
  opacity: 0.7
});

const cogLayer = new WGLTileLayer({
  source: new GeoTIFF({
    sources: [{ url: `/public/lst_${state.currentTime}.tif` }]
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
});

function meanLayerStyle(feature: FeatureLike) {
  const props = feature.getProperties();
  const deltaTs = props["temperature"];
  const timeSeries: Datum[] = [];
  for (const [time, values] of Object.entries(deltaTs)) {
    const {tMeanInside, tMeanOutside} = values as any;
    if (tMeanInside === "NaN" || tMeanOutside === "NaN") continue;
    timeSeries.push({ label: time.slice(0, 10), value: tMeanInside - tMeanOutside });
  }
  const mean = timeSeries.reduce((prev, current) => prev + current.value, 0) / timeSeries.length;
  if (Number.isNaN(mean)) return new Style({
    fill: new Fill({
      color: `rgb(125, 125, 125)`
    })
  })

  const maxVal = 2.0;
  const minVal = -2.0;
  const {r, g, b} = colorScale(mean, minVal, maxVal);

  return new Style({
    fill: new Fill({
      color: `rgb(${r}, ${g}, ${b})`
    })
  });
}

function createTimeLayerStyle(time: string) {
  return (feature: FeatureLike) => {
    const delta = featureDeltaTatTime(feature, time);
  
    if (delta === "NaN") {
      return new Style({
        fill: new Fill({
          color: `rgb(50, 50, 50)`
        })
      });
    }
  
    const maxVal = 2.0;
    const minVal = -2.0;
    const {r, g, b} = colorScale(delta, minVal, maxVal);
  
    return new Style({
      fill: new Fill({
        color: `rgb(${r}, ${g}, ${b})`
      })
    });
  }
}


const vectorLayer = new VectorLayer({
  source: new VectorSource({
    features: new GeoJSON().readFeatures(vectorData)
  }),
  style: meanLayerStyle
});

const view = new View({
  center: [11.3, 48.08],
  zoom: 14,
  projection: 'EPSG:4326'
});

const popupOverlay = new Overlay({
  element: popupDiv
});

const map = new Map({
  view, layers: [baseLayer, cogLayer, vectorLayer], overlays: [popupOverlay], target: appDiv
});





/**********************************************
 *   EVENTS
 *********************************************/


map.on("click", evt => handleMapClick(evt));
meanDiv.addEventListener('click', activateMeanView);
timeDiv.addEventListener('click', activateTimeView);
timeControlBackDiv.addEventListener('click', timeBack);
timeControlForwardDiv.addEventListener('click', timeForward);


/**********************************************
 *   REACT TO ACTIONS
 *********************************************/


function timeBack() {
  if (state.mode === "mean") return;
  const indexCurrent = state.availableTimes.indexOf(state.currentTime);
  const newTime = state.availableTimes[indexCurrent - 1];
  state.currentTime = newTime;
  updateTimeButtons(state);
  vectorLayer.setStyle(createTimeLayerStyle(state.currentTime));
  popupDiv.innerHTML = popupText(state);
  cogLayer.setVisible(true);
  cogLayer.setSource(new GeoTIFF({
    sources: [{ url: `/public/lst_${state.currentTime}.tif` }]
  }));
}

function timeForward() {
  if (state.mode === "mean") return;
  const indexCurrent = state.availableTimes.indexOf(state.currentTime);
  const newTime = state.availableTimes[indexCurrent + 1];
  state.currentTime = newTime;
  updateTimeButtons(state);
  vectorLayer.setStyle(createTimeLayerStyle(state.currentTime));
  updatePopup(state);
  cogLayer.setVisible(true);
  cogLayer.setSource(new GeoTIFF({
    sources: [{ url: `/public/lst_${state.currentTime}.tif` }]
  }));}

function activateTimeView() {
  state.mode = "time";
  meanDiv.classList.replace('active', 'inactive');
  timeDiv.classList.replace('inactive', 'active');
  timeModeSelectInput.checked = true;
  meanModeSelectInput.checked = false;
  timeControlCurrentTimeDiv.innerHTML = state.currentTime.slice(0, 10);
  vectorLayer.setStyle(createTimeLayerStyle(state.currentTime));
  updatePopup(state);
  cogLayer.setVisible(true);
}

function activateMeanView() {
  state.mode = "mean";
  meanDiv.classList.replace('inactive', 'active');
  timeDiv.classList.replace('active', 'inactive');
  timeModeSelectInput.checked = false;
  meanModeSelectInput.checked = true;
  timeControlCurrentTimeDiv.innerHTML = "";
  vectorLayer.setStyle(meanLayerStyle);
  updatePopup(state);
  cogLayer.setVisible(false);
}


function handleMapClick(evt: MapBrowserEvent<any>) {
  const location = evt.coordinate;
  const features = vectorLayer.getSource()?.getFeaturesAtCoordinate(location);

  if (features && features?.length > 0) {
    state.clickedFeature = features[0];
    updatePopup(state);
    popupOverlay.setPosition(location);
  } else {
    state.clickedFeature = undefined;
    popupOverlay.setPosition(undefined);
  }
}

function updatePopup(state: State) {
  if (!state.clickedFeature) return;

  popupDiv.innerHTML = "";

  const props = state.clickedFeature.getProperties();
  const deltaTs = props["temperature"];
  const timeSeries: Datum[] = [];
  for (const [time, values] of Object.entries(deltaTs)) {
    const {tMeanInside, tMeanOutside} = values as any;
    if (tMeanInside === "NaN" || tMeanOutside === "NaN") continue;
    timeSeries.push({ label: time.slice(0, 10), value: tMeanInside - tMeanOutside });
  }
  timeSeries.sort((a, b) => a.label < b.label ? -1 : 1);
  const vMean = timeSeries.reduce((prev, current) => prev + current.value, 0) / timeSeries.length;
  barchart()
  .container(popupDiv)
  .width(250).height(250)
  .data(timeSeries)
  .xlabel('time').ylabel('delta T')
  .margin({ top: 20, left: 50, bottom: 50, right: 10})
  .hlines([{label: "mean", value: vMean}])();
  
  const textDiv = document.createElement('div');
  textDiv.innerHTML = popupText(state);
  popupDiv.appendChild(textDiv);
}

function popupText(state: State): string {
  const feature = state.clickedFeature;
  if (!feature) return "";

  const mean = featureMeanDeltaT(feature);
  if (state.mode === "mean") {
    return `<div><p>Delta T (mean): ${mean.toFixed(2)} °C</p></div>`;
  } else {
    const dt = featureDeltaTatTime(feature, state.currentTime);
    return `
    <div>
      <p>Delta T (mean): ${mean.toFixed(2)} °C</p>
      <p>Delta T (time): ${dt === "NaN" ? dt : dt.toFixed(2)} °C</p>
    </div>
    `;
  }

}


function updateTimeButtons(state: State) {
  const indexCurrent = state.availableTimes.indexOf(state.currentTime);
  if (indexCurrent <= 0) {
    timeControlBackDiv.classList.replace("active", "inactive");
    return;
  } else {
    timeControlBackDiv.classList.replace("inactive", "active");
  }
  if (indexCurrent >= (state.availableTimes.length - 1)) {
    timeControlForwardDiv.classList.replace("active", "inactive");
    return;
  } else {
    timeControlForwardDiv.classList.replace("inactive", "active");
  }
}



/**********************************************
 *   HELPERS
 *********************************************/


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

function featureDeltaTatTime(feature: FeatureLike, time: string) {
  const props = feature.getProperties();
  const deltaTs = props["temperature"];
  const values = deltaTs[time];
  const tMeanInside = (values as any)["tMeanInside"];
  const tMeanOutside = (values as any)["tMeanOutside"];
  if (tMeanInside === "NaN" || tMeanOutside === "NaN") return "NaN";
  const tIn = parseFloat(tMeanInside as string);
  const tOut = parseFloat(tMeanOutside as string);
  const val = tIn - tOut;
  return val;
}