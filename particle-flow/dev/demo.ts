import { renderLoop } from '@mgx/engine1';
import { ParticleFlow } from '../src/particle_flow';
import { FeatureCollection, Point } from 'geojson';


const canvas = document.getElementById('canvas') as HTMLCanvasElement;

const demoData: FeatureCollection<Point> = {
    type: 'FeatureCollection',
    features: [{
        type: 'Feature',
        properties: {},
        geometry: {
            type: 'Point',
            coordinates: [0, 0]
        }
    }, {
        type: 'Feature',
        properties: {},
        geometry: {
            type: 'Point',
            coordinates: [0, 1]
        }
    }, {
        type: 'Feature',
        properties: {},
        geometry: {
            type: 'Point',
            coordinates: [1, 1]
        }
    }, {
        type: 'Feature',
        properties: {},
        geometry: {
            type: 'Point',
            coordinates: [1, 0]
        }
    }]
};

const pf = new ParticleFlow(canvas.getContext('webgl'), demoData, [0, 0, 1, 1]);

renderLoop(60, (tDelta: number) => {
    pf.render(tDelta);
});