import { ArrayBundle, AttributeData, Context, Program, UniformData } from '@mgx/engine1';
import { FeatureCollection, Point } from 'geojson';
import Delaunator from 'delaunator';


export class ParticleFlow {
    private bundle: ArrayBundle;
    private context: Context;

    constructor(gl: WebGLRenderingContext, data: FeatureCollection<Point>, bbox: number[]) {

        const coords = data.features.map(f => f.geometry.coordinates).flat();
        const d = new Delaunator(coords);
        const triangles = d.triangles;

        const context = new Context(gl, false);

        const program = new Program(`
            precision mediump float;
            attribute vec2 a_geoPosition;
            uniform vec4 u_geoBbox;

            vec4 geo2ClipPosition(vec2 geoPosition, vec4 geoBbox) {
                return vec4(
                    (geoPosition[0] - geoBbox[0]) / (geoBbox[2] - geoBbox[0]) * 2.0 - 1.0,
                    (geoPosition[1] - geoBbox[1]) / (geoBbox[3] - geoBbox[1]) * 2.0 - 1.0,
                    0.0,
                    1.0
                );
            }

            void main() {
                gl_Position = geo2ClipPosition(a_geoPosition, u_geoBbox);
            }
        `, `
            precision mediump float;

            void main() {
                gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);
            }
        `);

        const bundle = new ArrayBundle(
            program,
            {
                'a_geoPosition': new AttributeData(new Float32Array(triangles), 'vec2', false)
            }, {
                'u_geoBbox': new UniformData('vec4', bbox)
            }, {
                
            }, 'triangles', triangles.length
        );

        bundle.upload(context);
        bundle.initVertexArray(context);
        bundle.bind(context);

        this.bundle = bundle;
        this.context = context;
    }

    public render(tDelta: number) {
        this.bundle.draw(this.context);
    }
}