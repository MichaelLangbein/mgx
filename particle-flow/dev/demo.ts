import { renderLoop } from '../../utils/general';
import { ParticleFlow, ParticleFlowProps } from '../src/particle_flow';
import { FeatureCollection, Point } from 'geojson';


const canvas = document.getElementById('canvas') as HTMLCanvasElement;

const demoData: FeatureCollection<Point, ParticleFlowProps> = {
    type: 'FeatureCollection',
    features: [{
        type: 'Feature',
        properties: {
            speed: [0.32 * 255, 0.8 * 255]
        },
        geometry: {
            type: 'Point',
            coordinates: [0.2, 0.3]
        }
    }, {
        type: 'Feature',
        properties: {
            speed: [0.018 * 255, 0.4 * 2553]
        },
        geometry: {
            type: 'Point',
            coordinates: [0, 1]
        }
    }, {
        type: 'Feature',
        properties: {
            speed: [-0.14 * 255, 0.0 * 2552]
        },
        geometry: {
            type: 'Point',
            coordinates: [0.85, 0.7]
        }
    }, {
        type: 'Feature',
        properties: {
            speed: [0.87 * 255, 0.9 * 2555]
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