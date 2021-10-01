<h1><img src="https://raw.githubusercontent.com/MichaelLangbein/mgx/main/logo.svg" width="30">@mgx/particle-flow</h1>

Given a GeoJSON file with a `speed` property (a two-number-array), creates a particle-flow animation that interpolates the speed between the nodes of each Delaunay-triangle.

## Installation

```
npm i @mgx/particle-flow
```

## Example usage

```js
import { ParticleFlow, ParticleFlowProps } from '@mgx/particle_flow';
import { FeatureCollection, Point } from 'geojson';


const canvas = document.getElementById('canvas') as HTMLCanvasElement;

function renderLoop(fps: number, renderFunction: (tDelta: number) => void): void {

    const tTarget = 1000 * 1.0 / fps;
    let tCalculation = 0;
    let tSleep = tTarget;
    let tStart = 0.0;
    let tNow = 0.0;
    let timeSinceLastRenderCall = 0.0;

    const render = () => {
        tStart = window.performance.now();

        timeSinceLastRenderCall = tCalculation + tSleep;
        renderFunction(timeSinceLastRenderCall);

        tNow = window.performance.now();
        tCalculation = tNow - tStart;
        tSleep = Math.max(tTarget - tCalculation, 0);
        setTimeout(() => {
            requestAnimationFrame(render);
        }, tSleep);

    };

    render();
}

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
            speed: [0.018, 0.43]
        },
        geometry: {
            type: 'Point',
            coordinates: [0, 1]
        }
    }, {
        type: 'Feature',
        properties: {
            speed: [-0.14, 0.02]
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

```