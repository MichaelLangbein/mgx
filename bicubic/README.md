<h1><img src="https://raw.githubusercontent.com/MichaelLangbein/mgx/main/logo.svg" width="30">@mgx/bicubic</h1>

Simple interpolation library that uses WebGL-2 to do bicubic interpolation.

## Installation
```
npm i @mgx/bicubic-interpolation
```

## Example usage: 

```js
import { GridPointProps, SplineRenderer } from '@mgx/bicubic-interpolation';
import { FeatureCollection, Point } from 'geojson';


const canvas = document.getElementById('canvas') as HTMLCanvasElement;

const demoData: FeatureCollection<Point, GridPointProps> = {
    "type": "FeatureCollection",
    "features": [
      {
        "type": "Feature",
        "properties": {
          "row": 1,
          "col": 1,
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
      {
        "type": "Feature",
        "properties": {
          "row": 1,
          "col": 2,
          "value": 14
        },
        "geometry": {
          "type": "Point",
          "coordinates": [
            73.47656249999999,
            66.08936427047088
          ]
        }
      },
  ...
      {
        "type": "Feature",
        "properties": {
          "row": 4,
          "col": 5,
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

const sr = new SplineRenderer(canvas.getContext('webgl2'), demoData, [53.4375, 51.944264879028765, 119.53125, 68.13885164925573]);
sr.render();

```

