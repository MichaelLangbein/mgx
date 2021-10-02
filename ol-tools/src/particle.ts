/**
 * This code was first developed [here](https://github.com/michaellangbein/webglexperiments)
 * It has been further developed [here](https://github.com/dlr-eoc/ukis-frontend-libraries) 
 * Since then, modifications have been made to the code. (with this we comply with Apache-2.0 $4.b)
 * The original license from https://github.com/dlr-eoc/ukis-frontend-libraries can be found in this repo as `license.orig.txt` (with this we comply with Apache-2.0 $4.a)
 */

import { ParticleFlow, ParticleFlowProps, renderLoop } from '@mgx/particle-flow';
import { FeatureCollection, Point } from 'geojson';
import { Extent } from 'ol/extent';
import Projection from 'ol/proj/Projection';
import { Size } from 'ol/size';
import { ImageCanvas } from 'ol/source';

export class ParticleWrapper {

    private canvas: HTMLCanvasElement;
    private renderer: ParticleFlow;
    private olSource: ImageCanvas;

    constructor(
        canvas: HTMLCanvasElement,
        data: FeatureCollection<Point, ParticleFlowProps>,
        particleColor: [number, number, number]
    ) {
        const bbox = this.calculateBbox(data);

        this.canvas = canvas;
        this.renderer = new ParticleFlow(this.canvas.getContext('webgl'), data, particleColor, bbox);
        this.olSource = new ImageCanvas({
            canvasFunction: (extent: Extent, resolution: number, pixelRatio: number, size: Size, projection: Projection) => {
                this.renderer.setCanvasSize(size[0], size[1]);
                this.renderer.updateBbox(extent as [number, number, number, number]);
                return this.canvas;
            },
            imageSmoothing: true,
            ratio: 1,
        });
        
        renderLoop(60, (deltaT: number) => {
            this.renderer.render(deltaT);
            this.olSource.changed();
        });
    }

    getOlSource() {
        return this.olSource;
    }

    setParticleColor(newColor: [number, number, number]) {
        this.renderer.setParticleColor(newColor);
    }

    private calculateBbox(data: FeatureCollection<Point, ParticleFlowProps>) {
        const xs = data.features.map(f => f.geometry.coordinates[0]);
        const ys = data.features.map(f => f.geometry.coordinates[1]);
        const xMin = Math.min(...xs);
        const xMax = Math.max(...xs);
        const yMin = Math.min(...ys);
        const yMax = Math.max(...ys);
        return [xMin, yMin, xMax, yMax];
    }
}
