<h1><img src="https://raw.githubusercontent.com/MichaelLangbein/mgx/main/logo.svg" width="30">@mgx/particle-flow</h1>

Given a GeoJSON file with a `speed` property (a two-number-array), creates a particle-flow animation that interpolates the speed between the nodes of each Delaunay-triangle.

## Installation

```
npm i @mgx/particle-flow
```

## Example usage

```js
import { ParticleFlow, ParticleFlowProps, renderLoop } from '@mgx/particle_flow';
import { FeatureCollection, Point } from 'geojson';


const canvas = document.getElementById('canvas') as HTMLCanvasElement;

const demoData: FeatureCollection<Point, ParticleFlowProps> = {
    "type": "FeatureCollection",
    "features": [
      {
        "type": "Feature",
        "properties": {
          "speed": [2, 3]
        },
        "geometry": {
          "type": "Point",
          "coordinates": [
            20.0390625,
            21.616579336740603
          ]
        }
      },
      {
        "type": "Feature",
        "properties": {
          "speed": [3, 2]
        },
        "geometry": {
          "type": "Point",
          "coordinates": [
            15.468749999999998,
            36.31512514748051
          ]
        }
      },
      {
        "type": "Feature",
        "properties": {
          "speed": [4, 1]
        },
        "geometry": {
          "type": "Point",
          "coordinates": [
            36.5625,
            31.052933985705163
          ]
        }
      },
      {
        "type": "Feature",
        "properties": {
          "speed": [6, 0]
        },
        "geometry": {
          "type": "Point",
          "coordinates": [
            39.0234375,
            46.07323062540835
          ]
        }
      },
      {
        "type": "Feature",
        "properties": {
          "speed": [1, -2]
        },
        "geometry": {
          "type": "Point",
          "coordinates": [
            55.1953125,
            24.84656534821976
          ]
        }
      },
      {
        "type": "Feature",
        "properties": {
          "speed": [0.5, -3]
        },
        "geometry": {
          "type": "Point",
          "coordinates": [
            54.140625,
            41.77131167976407
          ]
        }
      },
      {
        "type": "Feature",
        "properties": {
          "speed": [-0.1, -3]
        },
        "geometry": {
          "type": "Point",
          "coordinates": [
            26.71875,
            57.136239319177434
          ]
        }
      }
    ]
  };

const pf = new ParticleFlow(canvas.getContext('webgl'), demoData, [3.515625, 18.979025953255267, 64.3359375, 62.103882522897855]);

renderLoop(60, (tDelta: number) => {
    pf.render(tDelta);
});

```