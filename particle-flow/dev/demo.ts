import { renderLoop } from '@mgx/engine1';
import { ParticleFlow, ParticleFlowProps } from '../src/particle_flow';
import { FeatureCollection, Point } from 'geojson';


const canvas = document.getElementById('canvas') as HTMLCanvasElement;

const demoData: FeatureCollection<Point, ParticleFlowProps> = {
    type: 'FeatureCollection',
    features: [{
        type: 'Feature',
        properties: {
            speed: [0.32, 0.8]
        },
        geometry: {
            type: 'Point',
            coordinates: [0.2, 0.3]
        }
    }, {
        type: 'Feature',
        properties: {
            speed: [0.68, 0.43]
        },
        geometry: {
            type: 'Point',
            coordinates: [0, 1]
        }
    }, {
        type: 'Feature',
        properties: {
            speed: [0.14, 0.02]
        },
        geometry: {
            type: 'Point',
            coordinates: [0.85, 0.7]
        }
    }, {
        type: 'Feature',
        properties: {
            speed: [0.87, 0.95]
        },
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