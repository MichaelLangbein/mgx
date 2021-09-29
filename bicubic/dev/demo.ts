import { GridPointProps, SplineRenderer } from '../src/cubicSplines_webgl2';
import { FeatureCollection, Point } from 'geojson';


const canvas = document.getElementById('canvas') as HTMLCanvasElement;

const demoData: FeatureCollection<Point, GridPointProps> = {
    type: 'FeatureCollection',
    features: [{
        type: 'Feature',
        properties: {
            col: 0, row: 0,
            value: 1
        },
        geometry: {
            type: 'Point',
            coordinates: [0, 0]
        }
    }, {
        type: 'Feature',
        properties: {
            col: 0, row: 1,
            value: 2
        },
        geometry: {
            type: 'Point',
            coordinates: [0, 1]
        }
    }, {
        type: 'Feature',
        properties: {
            col: 1, row: 1,
            value: 1.5
        },
        geometry: {
            type: 'Point',
            coordinates: [1, 1]
        }
    }, {
        type: 'Feature',
        properties: {
            col: 0, row: 1,
            value: 2.1
        },
        geometry: {
            type: 'Point',
            coordinates: [1, 0]
        }
    }]
};

const cs = new SplineRenderer(canvas.getContext('webgl2'), demoData, [0, 0, 1, 1]);

cs.render();
