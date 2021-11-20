import {
    Program, TextureData, UniformData, getCurrentFramebuffersPixels,
    Bundle, Context, FramebufferObject, AttributeData, ArrayBundle,
    createEmptyFramebufferObject
} from '../../engine1/src/index';
import { rectangleA } from '../../utils/shapes';


const eulerPropagation = new Program(/*glsl*/`
    precision mediump float;
    attribute vec4 a_vertex;
    attribute vec2 a_textureCoord;
    varying vec2 v_textureCoord;

    void main() {
        v_textureCoord = a_textureCoord;
        gl_Position = vec4(a_vertex.xyz, 1.0);
    }
`, /*glsl*/`
    precision mediump float;
    varying vec2 v_textureCoord;
    uniform sampler2D u_huvTexture;
    uniform sampler2D u_HTexture;
    uniform vec2 u_textureSize;
    uniform float u_g;
    uniform float u_b;
    uniform float u_f;
    uniform float u_dt;
    uniform float u_dx;
    uniform float u_dy;
    uniform vec2 u_hRange;
    uniform vec2 u_uRange;
    uniform vec2 u_vRange;
    uniform float u_HMax;
    
    void main() {
        
        //---------------- accessing data from textures ----------------------------------
        float deltaX = 1.0 / u_textureSize[0];
        float deltaY = 1.0 / u_textureSize[1];
        // @TODO: implement mirroring/sameval edge-conditions here
        vec4 huv   = texture2D( u_huvTexture, v_textureCoord                     );
        vec4 huvpx = texture2D( u_huvTexture, v_textureCoord + vec2(deltaX, 0.0) );
        vec4 huvmx = texture2D( u_huvTexture, v_textureCoord - vec2(deltaX, 0.0) );
        vec4 huvpy = texture2D( u_huvTexture, v_textureCoord - vec2(0.0, deltaY) );
        vec4 huvmy = texture2D( u_huvTexture, v_textureCoord + vec2(0.0, deltaY) );
        vec4 H00   = texture2D( u_HTexture,   v_textureCoord                     );
        //---------------------------------------------------------------------------------


        //---------------- stretching texture values to data-range ------------------------
        float hMin = u_hRange[0];
        float hMax = u_hRange[1];
        float uMin = u_uRange[0];
        float uMax = u_uRange[1];
        float vMin = u_vRange[0];
        float vMax = u_vRange[1];
        float h   = (hMax - hMin) * huv[0]   + hMin;
        float hpx = (hMax - hMin) * huvpx[0] + hMin;
        float hmx = (hMax - hMin) * huvmx[0] + hMin;
        float hpy = (hMax - hMin) * huvpy[0] + hMin;
        float hmy = (hMax - hMin) * huvmy[0] + hMin;
        float u   = (uMax - uMin) * huv[1]   + uMin;
        float upx = (uMax - uMin) * huvpx[1] + uMin;
        float umx = (uMax - uMin) * huvmx[1] + uMin;
        float v   = (vMax - vMin) * huv[2]   + vMin;
        float vpy = (vMax - vMin) * huvpy[2] + vMin;
        float vmy = (vMax - vMin) * huvmy[2] + vMin;
        float H   = H00[0] * u_HMax;
        float g   = u_g;
        float b   = u_b;
        float f   = u_f;
        float dt  = u_dt;
        float dx  = u_dx;
        float dy  = u_dy;
        //--------------------------------------------------------------------------------


        //---------------- actual calculations -------------------------------------------
        float dudx = (upx - umx) / (2.0 * dx);
        float dvdy = (vpy - vmy) / (2.0 * dy);
        float dhdx = (hpx - hmx) / (2.0 * dx);
        float dhdy = (hpy - hmy) / (2.0 * dy);
        float hNew =      - H * ( dudx + dvdy ) * dt + h;
        float uNew = ( + f*v - b*u - g * dhdx ) * dt + u;
        float vNew = ( - f*u - b*v - g * dhdy ) * dt + v;
        //--------------------------------------------------------------------------------


        //---------------- compressing values down to texture-value-range ----------------
        float hTex = (hNew - hMin) / (hMax - hMin);
        float uTex = (uNew - uMin) / (uMax - uMin);
        float vTex = (vNew - vMin) / (vMax - vMin);
        hTex = max(min(hTex, 1.0), 0.0); 
        uTex = max(min(uTex, 1.0), 0.0);
        vTex = max(min(vTex, 1.0), 0.0);
        //---------------------------------------------------------------------------------

        gl_FragColor = vec4(hTex, uTex, vTex, 1.0);
    }
`);

const augmentedEulerPropagation = new Program(/*glsl*/`
    precision mediump float;
    attribute vec4 a_vertex;
    attribute vec2 a_textureCoord;
    varying vec2 v_textureCoord;

    void main() {
        v_textureCoord = a_textureCoord;
        gl_Position = vec4(a_vertex.xyz, 1.0);
    }
`, /*glsl*/`
    precision mediump float;
    varying vec2 v_textureCoord;
    uniform sampler2D u_huvTexture_initial;
    uniform sampler2D u_huvTexture_naiveProp;
    uniform sampler2D u_HTexture;
    uniform vec2 u_textureSize;
    uniform float u_g;
    uniform float u_b;
    uniform float u_f;
    uniform float u_dt;
    uniform float u_dx;
    uniform float u_dy;
    uniform vec2 u_hRange;
    uniform vec2 u_uRange;
    uniform vec2 u_vRange;
    uniform float u_HMax;

    void main() {

        //---------------- accessing data from textures ---------------------------------
        float deltaX = 1.0 / u_textureSize[0];
        float deltaY = 1.0 / u_textureSize[1];
        vec4 huv_t         = texture2D( u_huvTexture_initial,   v_textureCoord                     );
        vec4 huv_tdelta    = texture2D( u_huvTexture_naiveProp, v_textureCoord                     );
        vec4 huv_tdelta_px = texture2D( u_huvTexture_naiveProp, v_textureCoord + vec2( deltaX, 0 ) );
        vec4 huv_tdelta_mx = texture2D( u_huvTexture_naiveProp, v_textureCoord - vec2( deltaX, 0 ) );
        vec4 huv_tdelta_py = texture2D( u_huvTexture_naiveProp, v_textureCoord + vec2( 0, deltaY ) );
        vec4 huv_tdelta_my = texture2D( u_huvTexture_naiveProp, v_textureCoord - vec2( 0, deltaY ) );
        vec4 H_            = texture2D( u_HTexture,             v_textureCoord                     );
        //-------------------------------------------------------------------------------


        //---------------- stretching texture values to data-range ----------------------
        float hMin        = u_hRange[0];
        float hMax        = u_hRange[1];
        float uMin        = u_uRange[0];
        float uMax        = u_uRange[1];
        float vMin        = u_vRange[0];
        float vMax        = u_vRange[1];
        float h_t         = (hMax - hMin) * huv_t[0]         + hMin;
        float u_t         = (uMax - uMin) * huv_t[1]         + uMin;
        float v_t         = (vMax - vMin) * huv_t[2]         + vMin;
        float h_tdelta    = (hMax - hMin) * huv_tdelta[0]    + hMin;
        float u_tdelta    = (uMax - uMin) * huv_tdelta[1]    + uMin;
        float v_tdelta    = (vMax - vMin) * huv_tdelta[2]    + vMin;
        float h_tdelta_px = (hMax - hMin) * huv_tdelta_px[0] + hMin;
        float h_tdelta_mx = (hMax - hMin) * huv_tdelta_mx[0] + hMin;
        float h_tdelta_py = (hMax - hMin) * huv_tdelta_py[0] + hMin;
        float h_tdelta_my = (hMax - hMin) * huv_tdelta_my[0] + hMin;
        float u_tdelta_px = (uMax - uMin) * huv_tdelta_px[1] + uMin;
        float u_tdelta_mx = (uMax - uMin) * huv_tdelta_mx[1] + uMin;
        float v_tdelta_py = (vMax - vMin) * huv_tdelta_px[2] + vMin;
        float v_tdelta_my = (vMax - vMin) * huv_tdelta_mx[2] + vMin;
        float H   = H_[0] * u_HMax;
        float g   = u_g;
        float b   = u_b;
        float f   = u_f;
        float dt  = u_dt;
        float dx  = u_dx;
        float dy  = u_dy;
        //--------------------------------------------------------------------------------


        //---------------- actual calculations -------------------------------------------
        // 1. initial differentials from naive euler pass dxdt_t
        float dhdt_t = h_tdelta - h_t;
        float dudt_t = u_tdelta - u_t;
        float dvdt_t = v_tdelta - v_t;

        // 2. differentials at t+delta: dxdt_tdelta
        float dudx_tdelta = (u_tdelta_px - u_tdelta_mx) / (2.0 * dx);
        float dvdy_tdelta = (v_tdelta_py - v_tdelta_my) / (2.0 * dy);
        float dhdx_tdelta = (h_tdelta_px - h_tdelta_mx) / (2.0 * dx);
        float dhdy_tdelta = (h_tdelta_py - h_tdelta_my) / (2.0 * dy);

        float dhdt_tdelta = - H * ( dudx_tdelta + dvdy_tdelta );
        float dudt_tdelta =   f * v_tdelta - b * u_tdelta - g * dhdx_tdelta;
        float dvdt_tdelta = - f * u_tdelta - b * v_tdelta - g * dhdy_tdelta;

        // 3. augmented euler: mean of t and t+delta differentials
        float hNew = h_t + dt * (dhdt_t + dhdt_tdelta) / 2.0;
        float uNew = u_t + dt * (dudt_t + dudt_tdelta) / 2.0;
        float vNew = v_t + dt * (dvdt_t + dvdt_tdelta) / 2.0;
        //--------------------------------------------------------------------------------


        //---------------- compressing values down to texture-value-range ----------------
        float hTex = (hNew - hMin) / (hMax - hMin);
        float uTex = (uNew - uMin) / (uMax - uMin);
        float vTex = (vNew - vMin) / (vMax - vMin);
        hTex = max(min(hTex, 1.0), 0.0); 
        uTex = max(min(uTex, 1.0), 0.0);
        vTex = max(min(vTex, 1.0), 0.0);
        //---------------------------------------------------------------------------------

        gl_FragColor = vec4(hTex, uTex, vTex, 1.0);
    }
`);


export class SweRenderer {

    private naiveEuler: Bundle;
    private augmentedEuler: Bundle;
    private context: Context;
    private naiveEulerOut: FramebufferObject;
    private augmentedEulerOut0: FramebufferObject;
    private augmentedEulerOut1: FramebufferObject;
    private i = 0;
    
    constructor(
        outputCanvas: HTMLCanvasElement,
        huv: HTMLImageElement, 
        H: HTMLImageElement
    ) {
  
        const w = huv.width;
        const h = huv.height;

        outputCanvas.width = w;
        outputCanvas.height = h;

        const rect = rectangleA(2, 2);
        
        const vertexData = {
            'a_vertex': new AttributeData(new Float32Array(rect.vertices.flat()), 'vec4', false),
            'a_textureCoord': new AttributeData(new Float32Array(rect.texturePositions.flat()), 'vec2', false),
        };
        
        const uniformData = {
            'u_textureSize': new UniformData('vec2', [w, h]),
            'u_g':           new UniformData('float', [9.8]),     // https://www.google.com/search?q=gravitational+acceleration+constant&rlz=1C1GCEU_deDE869DE869&sxsrf=AOaemvKhOiXVsEX5hXOYDIVhCqvaO51Ekw%3A1637142341924&ei=Rc-UYa7qN8OyqtsP6fC-4As&oq=gravitational+acc&gs_lcp=Cgdnd3Mtd2l6EAMYATIFCAAQgAQyBQgAEIAEMgUIABCABDIFCAAQgAQyBQgAEMsBMgUIABCABDIFCAAQgAQyBQgAEIAEMgUIABCABDIFCAAQgAQ6BwgAEEcQsAM6BwgAELADEEM6BQgAEJECOgUILhDLAUoECEEYAFDiBFj9B2DuHGgCcAJ4AIABZIgB9wGSAQMyLjGYAQCgAQHIAQrAAQE&sclient=gws-wiz
            'u_b':           new UniformData('float', [0.001]),   // https://en.wikipedia.org/wiki/Drag_(physics)
            'u_f':           new UniformData('float', [0.00528]), // https://www.google.com/search?q=correolis+coefficient+at+45+degrees&rlz=1C1GCEU_deDE869DE869&oq=correolis+coefficient+at+45+degrees&aqs=chrome..69i57j33i22i29i30.12278j0j4&sourceid=chrome&ie=UTF-8
            'u_dt':          new UniformData('float', [0.2]),
            'u_dx':          new UniformData('float', [10000 / huv.width]),
            'u_dy':          new UniformData('float', [10000 / huv.height]),
            'u_hRange':      new UniformData('vec2', [-0.1, 0.1]),
            'u_uRange':      new UniformData('vec2', [-0.1, 0.1]),
            'u_vRange':      new UniformData('vec2', [-0.1, 0.1]),
            'u_HMax':        new UniformData('float', [10])
        };
        
        
        this.naiveEuler = new ArrayBundle(
            eulerPropagation, 
            vertexData, 
            uniformData, 
            {
                'u_huvTexture': new TextureData(huv),
                'u_HTexture':   new TextureData(H),
            }, 
            'triangles', 
            rect.vertices.length
        );

        this.augmentedEuler = new ArrayBundle(
            augmentedEulerPropagation,
            vertexData,
            uniformData,
            {
                'u_huvTexture_initial':   new TextureData(huv),
                'u_huvTexture_naiveProp': new TextureData(huv),
                'u_HTexture':             new TextureData(H),
            },
            'triangles',
            rect.vertices.length
        );

        this.context = new Context(outputCanvas.getContext('webgl', {preserveDrawingBuffer: true}), true);
        this.naiveEulerOut      = createEmptyFramebufferObject(this.context.gl, w, h, 'data');
        this.augmentedEulerOut0 = createEmptyFramebufferObject(this.context.gl, w, h, 'data');
        this.augmentedEulerOut1 = createEmptyFramebufferObject(this.context.gl, w, h, 'data');

        //------- binding shaders and first draw ----------------------------------------------------------------------
        this.naiveEuler.upload(this.context);
        this.naiveEuler.initVertexArray(this.context);
        this.naiveEuler.bind(this.context);
        this.naiveEuler.draw(this.context, [0, 0, 0, 0], this.naiveEulerOut);
    
        this.augmentedEuler.upload(this.context);
        this.augmentedEuler.initVertexArray(this.context);
        this.augmentedEuler.bind(this.context);
        this.augmentedEuler.updateTextureData(this.context, 'u_huvTexture_naiveProp', this.naiveEulerOut.texture);
        this.augmentedEuler.draw(this.context, [0, 0, 0, 0], this.augmentedEulerOut0);
        //--------------------------------------------------------------------------------------------------------------
    }

    
    public render() {
        //-------- first draw: to fb, as to update the source texture for next iteration ----------------
        if (this.i % 2 === 0) {
            this.naiveEuler.bind(this.context);
            this.naiveEuler.updateTextureData(this.context, 'u_huvTexture', this.augmentedEulerOut0.texture);
            this.naiveEuler.draw(this.context, [0, 0, 0, 0], this.naiveEulerOut);
    
            this.augmentedEuler.bind(this.context);
            this.augmentedEuler.updateTextureData(this.context, 'u_huvTexture_initial', this.augmentedEulerOut0.texture);
            this.augmentedEuler.updateTextureData(this.context, 'u_huvTexture_naiveProp', this.naiveEulerOut.texture);
            this.augmentedEuler.draw(this.context, [0, 0, 0, 0], this.augmentedEulerOut1);
        } else {
            this.naiveEuler.bind(this.context);
            this.naiveEuler.updateTextureData(this.context, 'u_huvTexture', this.augmentedEulerOut1.texture);
            this.naiveEuler.draw(this.context, [0, 0, 0, 0], this.naiveEulerOut);
    
            this.augmentedEuler.bind(this.context);
            this.augmentedEuler.updateTextureData(this.context, 'u_huvTexture_initial', this.augmentedEulerOut1.texture);
            this.augmentedEuler.updateTextureData(this.context, 'u_huvTexture_naiveProp', this.naiveEulerOut.texture);
            this.augmentedEuler.draw(this.context, [0, 0, 0, 0], this.augmentedEulerOut0);
        }
        this.i += 1;
        //------------------------------------------------------------------------------------------------

        //-------- second draw: to output-canvas, for visualization --------------------------------------
        this.augmentedEuler.draw(this.context, [0, 0, 0, 0]);
        //------------------------------------------------------------------------------------------------
    }

    public getImageData() {
        return getCurrentFramebuffersPixels(this.context.gl.canvas);
    }
}





