<h1><img src="https://raw.githubusercontent.com/MichaelLangbein/mgx/main/logo.svg" width="30">@mgx/inverse-distance-interpolation</h1>

Inverse distance interpolation between GeoJSON points using WebGL.

<img src="https://raw.githubusercontent.com/MichaelLangbein/mgx/main/inverse-distance/example.png" width="200">

## Installation

```
npm i @mgx/inverse-distance-interpolation
```


## Example usage:

```js
import { InterpolationRenderer } from '../src/inverseDistance_2steps';
import { InterpolationValue, ColorRamp } from '../src/interfaces';
import { FeatureCollection, Point } from 'geojson';


const canvas = document.getElementById('canvas') as HTMLCanvasElement;

const demoData: FeatureCollection<Point, InterpolationValue> = {
    "type": "FeatureCollection",
    "features": [
      {
        "type": "Feature",
        "properties": {
          "value": 12
        },
        "geometry": {
          "type": "Point",
          "coordinates": [
            56.953125,
            65.94647177615738
          ]
        }
      },
...
      {
        "type": "Feature",
        "properties": {
          "value": 9
        },
        "geometry": {
          "type": "Point",
          "coordinates": [
            116.71874999999999,
            54.97761367069628
          ]
        }
      }
    ]
};




const power = 2.0;
const smooth = true;
const maxEdgeLength = 20;
const storeIntp = false;
const colorRamp: ColorRamp = [
    {val: 3.0, rgb: [252,141,89]},
    {val: 11.0, rgb: [255,255,191]},
    {val: 20.0, rgb: [153,213,148]}
]

const cs = new InterpolationRenderer(
    canvas.getContext('webgl', {preserveDrawingBuffer: true}),
    demoData, power, smooth, maxEdgeLength, colorRamp, storeIntp
);

cs.render();

```
