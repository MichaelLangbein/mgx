import { GridPointProps, SplineRenderer } from '../src/cubicSplines_webgl2';
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
      {
        "type": "Feature",
        "properties": {
          "row": 1,
          "col": 3,
          "value": 11
        },
        "geometry": {
          "type": "Point",
          "coordinates": [
            88.24218749999999,
            66.08936427047088
          ]
        }
      },
      {
        "type": "Feature",
        "properties": {
          "row": 1,
          "col": 4,
          "value": 8
        },
        "geometry": {
          "type": "Point",
          "coordinates": [
            103.35937499999999,
            66.23145747862573
          ]
        }
      },
      {
        "type": "Feature",
        "properties": {
          "row": 1,
          "col": 5,
          "value": 9
        },
        "geometry": {
          "type": "Point",
          "coordinates": [
            114.9609375,
            66.51326044311185
          ]
        }
      },
      {
        "type": "Feature",
        "properties": {
          "row": 2,
          "col": 1,
          "value": 11
        },
        "geometry": {
          "type": "Point",
          "coordinates": [
            56.953125,
            61.270232790000634
          ]
        }
      },
      {
        "type": "Feature",
        "properties": {
          "row": 2,
          "col": 2,
          "value": 18
        },
        "geometry": {
          "type": "Point",
          "coordinates": [
            72.7734375,
            61.938950426660604
          ]
        }
      },
      {
        "type": "Feature",
        "properties": {
          "row": 2,
          "col": 3,
          "value": 16
        },
        "geometry": {
          "type": "Point",
          "coordinates": [
            88.24218749999999,
            62.103882522897855
          ]
        }
      },
      {
        "type": "Feature",
        "properties": {
          "row": 2,
          "col": 4,
          "value": 7
        },
        "geometry": {
          "type": "Point",
          "coordinates": [
            103.35937499999999,
            62.59334083012024
          ]
        }
      },
      {
        "type": "Feature",
        "properties": {
          "row": 2,
          "col": 5,
          "value": 3
        },
        "geometry": {
          "type": "Point",
          "coordinates": [
            115.31249999999999,
            63.074865690586634
          ]
        }
      },
      {
        "type": "Feature",
        "properties": {
          "row": 3,
          "col": 1,
          "value": 9
        },
        "geometry": {
          "type": "Point",
          "coordinates": [
            56.953125,
            57.51582286553883
          ]
        }
      },
      {
        "type": "Feature",
        "properties": {
          "row": 3,
          "col": 3,
          "value": 15
        },
        "geometry": {
          "type": "Point",
          "coordinates": [
            88.24218749999999,
            58.26328705248601
          ]
        }
      },
      {
        "type": "Feature",
        "properties": {
          "row": 3,
          "col": 4,
          "value": 11
        },
        "geometry": {
          "type": "Point",
          "coordinates": [
            103.35937499999999,
            58.99531118795094
          ]
        }
      },
      {
        "type": "Feature",
        "properties": {
          "row": 3,
          "col": 5,
          "value": 5
        },
        "geometry": {
          "type": "Point",
          "coordinates": [
            115.6640625,
            58.63121664342478
          ]
        }
      },
      {
        "type": "Feature",
        "properties": {
          "row": 4,
          "col": 1,
          "value": 12
        },
        "geometry": {
          "type": "Point",
          "coordinates": [
            57.30468749999999,
            52.696361078274485
          ]
        }
      },
      {
        "type": "Feature",
        "properties": {
          "row": 4,
          "col": 2,
          "value": 12
        },
        "geometry": {
          "type": "Point",
          "coordinates": [
            71.71875,
            53.54030739150022
          ]
        }
      },
      {
        "type": "Feature",
        "properties": {
          "row": 4,
          "col": 3,
          "value": 7
        },
        "geometry": {
          "type": "Point",
          "coordinates": [
            88.59374999999999,
            53.12040528310657
          ]
        }
      },
      {
        "type": "Feature",
        "properties": {
          "row": 4,
          "col": 4,
          "value": 6
        },
        "geometry": {
          "type": "Point",
          "coordinates": [
            103.0078125,
            54.36775852406841
          ]
        }
      },
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

const cs = new SplineRenderer(canvas.getContext('webgl2'), demoData, [53.4375, 51.944264879028765, 119.53125, 68.13885164925573]);

cs.render();
