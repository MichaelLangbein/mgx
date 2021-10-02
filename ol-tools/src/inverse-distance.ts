/**
 * This code was first developed [here](https://github.com/michaellangbein/webglexperiments)
 * It has been further developed [here](https://github.com/dlr-eoc/ukis-frontend-libraries) 
 * Since then, modifications have been made to the code. (with this we comply with Apache-2.0 $4.b)
 * The original license from https://github.com/dlr-eoc/ukis-frontend-libraries can be found in this repo as `license.orig.txt` (with this we comply with Apache-2.0 $4.a)
 */


import { ImageCanvas } from 'ol/source';
import { InterpolationRenderer, InterpolationValue, ColorRamp } from '@mgx/inverse-distance-interpolation';
import { FeatureCollection, Point } from 'geojson';
import { Size } from 'ol/size';
import { Extent } from 'ol/extent';
import Projection from 'ol/proj/Projection';


export class InverseDistanceWrapper {
    
    private renderer: InterpolationRenderer;
    private olSource: ImageCanvas;
    private canvas: HTMLCanvasElement;

    constructor(
        canvas: HTMLCanvasElement,
        data: FeatureCollection<Point, InterpolationValue>,
        power: number,
        smooth: boolean,
        maxEdgeLength: number,
        colorRamp: ColorRamp
    ) {

        this.canvas = canvas;
        this.renderer = new InterpolationRenderer(
            this.canvas.getContext('webgl'),
            data,
            power,
            smooth,
            maxEdgeLength,
            colorRamp,
            false
        );
        this.olSource = new ImageCanvas({
            canvasFunction: (extent: Extent, resolution: number, pixelRatio: number, size: Size, projection: Projection) => {
                this.renderer.setCanvasSize(size[0], size[1]);
                this.renderer.setBbox(extent as [number, number, number, number]);
                this.renderer.render();
                return this.canvas;
            },
            imageSmoothing: true,
            ratio: 1,
        });
    }

    public getOlSource() {
        return this.olSource;
    }

    public setPower(power: number) {
        this.renderer.setPower(power);
        this.renderer.render();
        this.olSource.changed();
    }

    public setSmoothing(smoothing: boolean) {
        this.renderer.setSmooth(smoothing);
        this.renderer.render();
        this.olSource.changed();
    }
}