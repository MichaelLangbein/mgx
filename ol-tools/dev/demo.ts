import { ColorRamp, InterpolationValue } from '@mgx/inverse-distance-interpolation';
import { FeatureCollection, Point } from 'geojson';
import { InverseDistanceWrapper } from '../src/inverse-distance';
import { Map, View } from 'ol';
import { Layer, Tile as TileLayer } from 'ol/layer';
import ImageLayer from 'ol/layer/Image';
import { OSM } from 'ol/source';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import { GeoJSON } from 'ol/format';
import 'ol/ol.css';


const target = document.getElementById('mapContainer') as HTMLDivElement;


const data: FeatureCollection<Point, InterpolationValue> = {
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
      {
        "type": "Feature",
        "properties": {
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


const osm = new TileLayer({
    source: new OSM()
});


const idlCanvas = document.createElement('canvas') as HTMLCanvasElement;
const colorRamp: ColorRamp = [
    {val: 3.0,  rgb: [252,141,89]},
    {val: 11.0, rgb: [255,255,191]},
    {val: 20.0, rgb: [153,213,148]}
];
const idw = new InverseDistanceWrapper(idlCanvas, data, 2.0, true, 15, colorRamp);
const idl = new ImageLayer({
    source: idw.getOlSource(),
});

const fl = new VectorLayer({
    source: new VectorSource({
        features: new GeoJSON().readFeatures(data)
    })
});

const layers = [osm, idl, fl];

const view = new View({
    center: [80, 60],
    zoom: 2,
    projection: 'EPSG:4326'
});

const map = new Map({
    target: target,
    layers, view
});
