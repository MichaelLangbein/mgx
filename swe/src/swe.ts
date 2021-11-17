import { ArrayBundle, AttributeData, Bundle, Context, Program, TextureData,  } from '@mgx/engine1';
import { rectangleA } from '../../utils/shapes';


const program = new Program(`
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
    varying vec2 v_textureCoord;
    uniform sampler2D u_huvTexture;
    uniform sampler2D u_HTexture;
    
    void main() {
        vec4 huv = texture2D(u_huvTexture, v_textureCoord);
        vec4 H00 = texture2D(u_HTexture, v_textureCoord);

        // float h = huv[0];
        // float u = huv[1];
        // float v = huv[2];
        // float hx1 = 
        // float hy1 = 
        // float ux1 = 
        // float vy1 = 
        // float H = H00[0];
        // float g = u_g;
        // float b = u_b;
        // float f = u_f;
        // float dt = u_dt;
        // float dx = u_dx;
        // float dy = u_dy;

        // float hNew = ( h - H * ( ((ux1 - u)/dx) + ((vx1 - v)/dy) ) ) * dt;
        // float uNew = (  f*v - b*u - g*((hx1 - h)/dx) + u ) * dt;
        // float vNew = ( -f*u - b*v - g*((hy1 - h)/dy) + v ) * dt;


        gl_FragColor = huv + H00;
    }
`);



export class SweRenderer {

    private bundle: Bundle;
    private context: Context;

    constructor(
        private outputCanvas: HTMLCanvasElement, 
        huv: HTMLImageElement, 
        H: HTMLImageElement
    ) {
        const rect = rectangleA(2, 2);
        
        this.bundle = new ArrayBundle(program, {
            'a_vertex': new AttributeData(new Float32Array(rect.vertices.flat()), 'vec4', false),
            'a_textureCoord': new AttributeData(new Float32Array(rect.texturePositions.flat()), 'vec2', false)
        }, { }, {
            'u_huvTexture': new TextureData(huv),
            'u_HTexture': new TextureData(H)
        }, 'triangles', rect.vertices.length);

        this.context = new Context(this.outputCanvas.getContext('webgl'), true);
    }

    public init() {
        this.bundle.upload(this.context);
        this.bundle.initVertexArray(this.context);
        this.bundle.bind(this.context);
    }
    
    public render() {
        this.bundle.draw(this.context, [0, 0, 0, 0]);
    }
}


