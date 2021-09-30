import { Index, ArrayBundle, ElementsBundle, AttributeData, Context, Program, TextureData, UniformData, createEmptyFramebufferObject, FramebufferObject } from '@mgx/engine1';
import { rectangleA } from '../../utils/shapes';
import { FeatureCollection, Point } from 'geojson';
import Delaunator from 'delaunator';


/**
 * @TODO: currently, input-values are expected to be in the range [0, 1].
 * Allow other values, too.
 */



export interface ParticleFlowProps {
    speed: [number, number];
}

export class ParticleFlow {
    private forceTextureBundle: ElementsBundle;
    private context: Context;
    private particleBundle: ArrayBundle;
    private forceTextureFb: FramebufferObject;
    private particleFb1: FramebufferObject;
    private particleFb2: FramebufferObject;
    private i: number;

    constructor(gl: WebGLRenderingContext, data: FeatureCollection<Point, ParticleFlowProps>, bbox: number[]) {

        const coords = data.features.map(f => f.geometry.coordinates).flat();
        const speeds = data.features.map(f => f.properties.speed);
        const d = new Delaunator(coords);
        const triangleIndices = d.triangles;
        const speedsPerIndex: [number, number][] = [];
        triangleIndices.forEach(ti => speedsPerIndex.push(speeds[ti]) );


        const context = new Context(gl, false);

        const forceTextureProgram = new Program(`
            precision mediump float;
            attribute vec2 a_geoPosition;
            attribute vec2 a_speed;
            varying vec2 v_speed;
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
                v_speed = a_speed;
                gl_Position = geo2ClipPosition(a_geoPosition, u_geoBbox);
            }
        `, `
            precision mediump float;
            varying vec2 v_speed;

            void main() {
                gl_FragColor = vec4(v_speed.xy, 0.0, 1.0);
            }
        `);

        const forceTextureBundle = new ElementsBundle(
            forceTextureProgram, {
                'a_geoPosition': new AttributeData(new Float32Array(coords), 'vec2', false),
                'a_speed': new AttributeData(new Float32Array(speedsPerIndex.flat()), 'vec2', false)
            }, {
                'u_geoBbox': new UniformData('vec4', bbox)
            }, {}, 'triangles', new Index(new Uint16Array(triangleIndices))
        );

        const forceTextureFb = createEmptyFramebufferObject(gl, 900, 900, 'data');
        forceTextureBundle.upload(context);
        forceTextureBundle.initVertexArray(context);
        forceTextureBundle.bind(context);
        forceTextureBundle.draw(context, [0, 0, 0, 0], forceTextureFb);


        
        const particleFb1 = createEmptyFramebufferObject(gl, gl.canvas.width, gl.canvas.height, 'display');
        const particleFb2 = createEmptyFramebufferObject(gl, gl.canvas.width, gl.canvas.height, 'display');

        const particleProgram = new Program(`
            precision mediump float;
            attribute vec4 a_vertex;
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

            float SPEEDFACTOR = 0.1;
            float FADERATE = 0.96;
            float SPAWNCHANCE = 0.002;
            
            void main() {
                // moving particles
                vec2 speed = ((texture2D(u_forceTexture, v_textureCoord) - 0.5 ) * 2.0).xy;
                vec2 samplePoint = v_textureCoord - speed * u_deltaT * SPEEDFACTOR;
                samplePoint = mod(samplePoint, 1.0);
                gl_FragColor = texture2D(u_particleTexture, samplePoint);

                // fade out
                if (gl_FragColor.x != 1.0) {
                    vec4 lastColor = texture2D(u_particleTexture, v_textureCoord);
                    vec4 fadedColor = lastColor * FADERATE;
                    gl_FragColor = fadedColor;
                }

                // spawn new ones
                float randVal = rand(v_textureCoord * abs(sin(u_deltaT * 10.0)) * 0.01);
                if (randVal > (1. - SPAWNCHANCE)) {  // spawn
                    gl_FragColor = vec4(1.0, 1.0, 1.0, 1.0);
                }

                if (gl_FragColor.x == 0.0) {
                    gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);
                }

                // no particles outside texture
                if (texture2D(u_forceTexture, v_textureCoord) == vec4(0.0, 0.0, 0.0, 0.0)) {
                    gl_FragColor = vec4(0.0, 0.0, 0.0, 0.0);
                }
            }
        `);

        const frame = rectangleA(2.0, 2.0);
        const particleBundle = new ArrayBundle(
            particleProgram, 
            {
                'a_vertex': new AttributeData(new Float32Array(frame.vertices.flat()), 'vec4', false),
                'a_textureCoord': new AttributeData(new Float32Array(frame.texturePositions.flat()), 'vec2', true)
            }, {
                'u_deltaT': new UniformData('float', [0.01])
            }, {
                'u_forceTexture': new TextureData(forceTextureFb.texture, 'ubyte4'),
                'u_particleTexture': new TextureData(particleFb1.texture, 'ubyte4')
            }, 'triangles', frame.vertices.length
        );

        particleBundle.upload(context);
        particleBundle.initVertexArray(context);
        particleBundle.bind(context);
        particleBundle.draw(context, [0, 0, 0, 0], particleFb1);
        particleBundle.updateTextureData(context, 'u_particleTexture', particleFb1.texture);
        particleBundle.draw(context, [0, 0, 0, 0], particleFb2);


        this.i = 0;
        this.forceTextureFb = forceTextureFb;
        this.particleFb1 = particleFb1;
        this.particleFb2 = particleFb2;
        this.forceTextureBundle = forceTextureBundle;
        this.particleBundle = particleBundle;
        this.context = context;
    }

    public render(tDelta: number) {
        this.particleBundle.updateUniformData(this.context, 'u_deltaT', [tDelta]);
        if (this.i % 2 === 0) {
            this.particleBundle.updateTextureData(this.context, 'u_particleTexture', this.particleFb2.texture);
            this.particleBundle.draw(this.context, [0, 0, 0, 0], this.particleFb1);
        } else {
            this.particleBundle.updateTextureData(this.context, 'u_particleTexture', this.particleFb1.texture);
            this.particleBundle.draw(this.context, [0, 0, 0, 0], this.particleFb2);
        }
        this.particleBundle.draw(this.context);
        this.i += 1;
    }

    public updateBbox(bbox: number[]) {
        this.forceTextureBundle.updateUniformData(this.context, 'u_geoBbox', bbox);
        this.forceTextureBundle.bind(this.context);
        this.forceTextureBundle.draw(this.context, [0, 0, 0, 0], this.forceTextureFb);
        // this.particleBundle.updateTextureData(this.context, 'u_forceTexture', this.forceTextureFb.texture);  <-- is this required?
        this.particleBundle.bind(this.context);
    }
}
