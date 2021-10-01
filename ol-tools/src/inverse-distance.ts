/**
 * This code was first developed [here](https://github.com/michaellangbein/webglexperiments)
 * It has been further developed [here](https://github.com/dlr-eoc/ukis-frontend-libraries) 
 * Since then, modifications have been made to the code. (with this we comply with Apache-2.0 $4.b)
 * The original license from https://github.com/dlr-eoc/ukis-frontend-libraries can be found in this repo as `license.orig.txt` (with this we comply with Apache-2.0 $4.a)
 */


import { ImageCanvas } from 'ol/source';
import { InterpolationRenderer, InterpolationValue, ColorRamp } from '@mgx/inverse-distance-interpolation';
import { FeatureCollection, Point } from 'geojson';

export function createInverseDistanceSource(gl, data: FeatureCollection<Point, InterpolationValue>, power: number, smooth: boolean, maxEdgeLength: number, colorRamp: ColorRamp) {
     
    const idr = new InterpolationRenderer(gl, data, power, smooth, maxEdgeLength, colorRamp, false);
    
    const ics = new ImageCanvas({
        canvasFunction: () => {},
        imageSmoothing: true,
        ratio: 1,

    })
}