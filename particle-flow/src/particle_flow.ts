import { 
    Index, ArrayBundle, ElementsBundle, AttributeData, Context, Program,
    TextureData, UniformData, createEmptyFramebufferObject, FramebufferObject 
} from '@mgx/engine1';
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
    private speedTextureBundle: ElementsBundle;
    private context: Context;
    private particleBundle: ArrayBundle;
    private speedTextureFb: FramebufferObject;
    private particleFb1: FramebufferObject;
    private particleFb2: FramebufferObject;
    private i: number;

    constructor(gl: WebGLRenderingContext, data: FeatureCollection<Point, ParticleFlowProps>, particleColor: [number, number, number], bbox: number[]) {

        const coords = data.features.map(f => f.geometry.coordinates).flat();
        const speeds = data.features.map(f => f.properties.speed);
        const minSpeed = Math.min(...speeds.flat());
        const maxSpeed = Math.max(...speeds.flat());
        const d = new Delaunator(coords);
        const triangleIndices = d.triangles;
        const speedsPerIndex: [number, number][] = [];
        triangleIndices.forEach(ti => speedsPerIndex.push(speeds[ti]) );
        const speedsNormalized = speedsPerIndex.map(speed => {
            return [
                (speed[0] - minSpeed) / (maxSpeed - minSpeed),
                (speed[1] - minSpeed) / (maxSpeed - minSpeed)
            ];
        });


        const context = new Context(gl, false);

        const speedTextureProgram = new Program(`
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

        const speedTextureBundle = new ElementsBundle(
            speedTextureProgram, {
                'a_geoPosition': new AttributeData(new Float32Array(coords), 'vec2', false),
                'a_speed': new AttributeData(new Float32Array(speedsNormalized.flat()), 'vec2', false)
            }, {
                'u_geoBbox': new UniformData('vec4', bbox)
            }, {}, 'triangles', new Index(new Uint16Array(triangleIndices))
        );

        const speedTextureFb = createEmptyFramebufferObject(gl, 900, 900, 'data');
        speedTextureBundle.upload(context);
        speedTextureBundle.initVertexArray(context);
        speedTextureBundle.bind(context);
        speedTextureBundle.draw(context, [0, 0, 0, 0], speedTextureFb);


        
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
            uniform sampler2D u_speedTexture;
            uniform sampler2D u_particleTexture;
            uniform float u_deltaT;
            uniform float u_rand;
            uniform vec3 u_particleColor;
            varying vec2 v_textureCoord;

            float rand(vec2 co){
                return fract(sin(dot(co.xy ,vec2(12.9898,78.233))) * 43758.5453);
            }

            float SPEEDFACTOR = 0.0003;
            float FADERATE = 0.999999;
            float SPAWNCHANCE = 0.0004;
            
            void main() {
                // moving particles
                vec2 speed = ((texture2D(u_speedTexture, v_textureCoord) - 0.5 ) * 2.0).xy;
                vec2 samplePoint = v_textureCoord - speed * u_deltaT * SPEEDFACTOR;
                samplePoint = mod(samplePoint, 1.0);  // if on edge: sampling from other side of texture
                gl_FragColor = texture2D(u_particleTexture, samplePoint);

                // fade out
                gl_FragColor = gl_FragColor * FADERATE;

                // making streaks disappear after a while
                if (gl_FragColor.x < 0.0001) {  
                    gl_FragColor = vec4(0.0, 0.0, 0.0, 0.0);
                }

                // spawn new ones
                float randVal = rand(v_textureCoord * abs(sin(u_rand)) * 0.01);
                if (randVal > (1. - SPAWNCHANCE)) {  // spawn
                    gl_FragColor = vec4(u_particleColor.xyz, 1.0);
                }

                // no particles outside texture
                if (texture2D(u_speedTexture, v_textureCoord) == vec4(0.0, 0.0, 0.0, 0.0)) {
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
                'u_deltaT': new UniformData('float', [0.01]),
                'u_rand': new UniformData('float', [Math.random()]),
                'u_particleColor': new UniformData('vec3', particleColor.map(c => c/255))
            }, {
                'u_speedTexture': new TextureData(speedTextureFb.texture, 'ubyte4'),
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
        this.speedTextureFb = speedTextureFb;
        this.speedTextureBundle = speedTextureBundle;
        this.particleFb1 = particleFb1;
        this.particleFb2 = particleFb2;
        this.particleBundle = particleBundle;
        this.context = context;
    }

    public render(tDelta: number, frameBuffer?: FramebufferObject) {

        this.particleBundle.updateUniformData(this.context, 'u_deltaT', [tDelta]);
        this.particleBundle.updateUniformData(this.context, 'u_rand', [Math.random()]);
        if (this.i % 2 === 0) {
            this.particleBundle.updateTextureData(this.context, 'u_particleTexture', this.particleFb2.texture);
            this.particleBundle.draw(this.context, [0, 0, 0, 0], this.particleFb1);
        } else {
            this.particleBundle.updateTextureData(this.context, 'u_particleTexture', this.particleFb1.texture);
            this.particleBundle.draw(this.context, [0, 0, 0, 0], this.particleFb2);
        }
        this.i += 1;

        if (frameBuffer) {
            this.particleBundle.draw(this.context, [0, 0, 0, 0], frameBuffer);
        } else {
            this.particleBundle.draw(this.context);
        }
    }

    public updateBbox(bbox: number[]) {
        this.speedTextureBundle.bind(this.context);
        this.speedTextureBundle.updateUniformData(this.context, 'u_geoBbox', bbox);
        this.speedTextureBundle.draw(this.context, [0, 0, 0, 0], this.speedTextureFb);
        // this.particleBundle.updateTextureData(this.context, 'u_speedTexture', this.forceTextureFb.texture);  <-- is this required?
        this.particleBundle.bind(this.context);
    }

    public setCanvasSize(width: number, height: number): void {
        if (this.context.gl.canvas.width !== width) this.context.gl.canvas.width = width;
        if (this.context.gl.canvas.height !== height) this.context.gl.canvas.height = height;
    }

    public setParticleColor(color: [number, number, number]) {
        this.particleBundle.updateUniformData(this.context, 'u_particleColor', color.map(c => c/255));
    }
}
