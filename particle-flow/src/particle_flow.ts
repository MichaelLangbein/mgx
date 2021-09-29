import { ArrayBundle, AttributeData, Context, Program, TextureData, UniformData } from '@mgx/engine1';
import { FeatureCollection, Point } from 'geojson';
import Delaunator from 'delaunator';
import { createEmptyFramebufferObject } from '@mgx/engine1/dist/engine1/src/webgl';



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


        
        const particleFb1 = createEmptyFramebufferObject(gl, gl.canvas.width, gl.canvas.height, 'display');
        const particleFb2 = createEmptyFramebufferObject(gl, gl.canvas.width, gl.canvas.height, 'display');

        const particleProgram = new Program(`
            attribute vec3 a_vertex;
            attribute vec2 a_textureCoord;
            varying vec2 v_textureCoord;
            void main() {
                v_textureCoord = a_textureCoord;
                gl_Position = vec4(a_vertex.xyz, 1.0);
            }
        `, `
            precision mediump float;
            uniform sampler2D u_forceTexture;
            uniform sampler2D u_particleTexture;
            uniform float u_deltaT;
            varying vec2 v_textureCoord;
            float rand(vec2 co){
                return fract(sin(dot(co.xy ,vec2(12.9898,78.233))) * 43758.5453);
            }
            void main() {
                // moving particles
                vec2 speed = ((texture2D(u_forceTexture, v_textureCoord) - 0.5 ) * 2.0).xy;
                vec2 samplePoint = v_textureCoord - speed * u_deltaT * 0.1;
                samplePoint = mod(samplePoint, 1.0);
                gl_FragColor = texture2D(u_particleTexture, samplePoint);
                // fade out
                float fadeRate = 0.95;
                if (gl_FragColor.x != 1.0) {
                    vec4 lastColor = texture2D(u_particleTexture, v_textureCoord);
                    vec4 fadedColor = vec4(lastColor.xyz * fadeRate, 1.0);
                    gl_FragColor = fadedColor;
                }
                // spawn and die-off
                float spawnChance = 0.0005;
                float dieChance = 0.2;
                float randVal = rand(v_textureCoord * abs(sin(u_deltaT)) * 0.01);
                if (randVal > (1. - spawnChance)) {  // spawn
                    gl_FragColor = vec4(1.0, 1.0, 1.0, 1.0);
                } if (randVal < dieChance) {   // die off
                    gl_FragColor = vec4(0.0, 0.0, 0.0, 0.0);
                }
                // no particles outside texture
                if (texture2D(u_forceTexture, v_textureCoord) == vec4(0.0, 0.0, 0.0, 0.0)) {
                    gl_FragColor = vec4(0.0, 0.0, 0.0, 0.0);
                }
            }
        `);

        const particleBundle = new ArrayBundle(
            particleProgram, 
            {
                'a_vertex': new AttributeData(),
                'a_textureCoord': new AttributeData()
            }, {
                'u_deltaT': new UniformData()
            }, {
                'u_forceTexture': new TextureData(),
                'u_particleTexture': new TextureData()
            }, 'triangles', nrAttributes
        );


        this.bundle = bundle;
        this.context = context;
    }

    public render(tDelta: number) {
        this.bundle.draw(this.context);
    }

    public updateBbox(bbox: number[]) {
        this.bundle.updateUniformData(this.context, 'u_geoBbox', bbox);
    }
}
