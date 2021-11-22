import {
    Program, TextureData, UniformData, getCurrentFramebuffersPixels,
    Bundle, Context, FramebufferObject, AttributeData, ArrayBundle,
    createEmptyFramebufferObject,
    createEmptyTexture,
    createFramebuffer
} from '../../engine2/src/index';
import { rectangleA } from '../../utils/shapes';


const eulerPropagation = new Program(/*glsl*/`#version 300 es
    precision mediump float;
    in vec4 a_vertex;
    in vec2 a_textureCoord;
    out vec2 v_textureCoord;

    void main() {
        v_textureCoord = a_textureCoord;
        gl_Position = vec4(a_vertex.xyz, 1.0);
    }
`, /*glsl*/`#version 300 es
    precision mediump float;
    in vec2 v_textureCoord;
    uniform sampler2D u_huvTexture;
    uniform sampler2D u_HTexture;
    uniform vec2 u_textureSize;
    uniform float u_g;
    uniform float u_b;
    uniform float u_f;
    uniform float u_dt;
    uniform float u_dx;
    uniform float u_dy;
    out vec4 fragColor;
    
    void main() {
        
        //---------------- accessing data from textures ----------------------------------
        float deltaX = 1.0 / u_textureSize[0];
        float deltaY = 1.0 / u_textureSize[1];
        // @TODO: implement mirroring/sameval edge-conditions here
        vec4 huv   = texture( u_huvTexture, v_textureCoord                     );
        vec4 huvpx = texture( u_huvTexture, v_textureCoord + vec2(deltaX, 0.0) );
        vec4 huvmx = texture( u_huvTexture, v_textureCoord - vec2(deltaX, 0.0) );
        vec4 huvpy = texture( u_huvTexture, v_textureCoord - vec2(0.0, deltaY) );
        vec4 huvmy = texture( u_huvTexture, v_textureCoord + vec2(0.0, deltaY) );
        vec4 H00   = texture( u_HTexture,   v_textureCoord                     );
        float h   = huv[0];
        float hpx = huvpx[0];
        float hmx = huvmx[0];
        float hpy = huvpy[0];
        float hmy = huvmy[0];
        float u   = huv[1];
        float upx = huvpx[1];
        float umx = huvmx[1];
        float v   = huv[2];
        float vpy = huvpy[2];
        float vmy = huvmy[2];
        float H   = H00[0];
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
        float hTex = hNew;
        float uTex = uNew;
        float vTex = vNew;
        //---------------------------------------------------------------------------------

        if (v_textureCoord.x > 0.95 || v_textureCoord.x < 0.05 || v_textureCoord.y > 0.95 || v_textureCoord.y < 0.05) {
            hTex = 0.0;
            uTex = 0.0;
            vTex = 0.0;
        }

        fragColor = vec4(hTex, uTex, vTex, 1.0);
    }
`);

const improvedEulerPropagation = new Program(/*glsl*/`#version 300 es
    precision mediump float;
    in vec4 a_vertex;
    in vec2 a_textureCoord;
    out vec2 v_textureCoord;

    void main() {
        v_textureCoord = a_textureCoord;
        gl_Position = vec4(a_vertex.xyz, 1.0);
    }
`, /*glsl*/`#version 300 es
    precision mediump float;
    in vec2 v_textureCoord;
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
    uniform float u_doRender;
    out vec4 fragColor;

    void main() {

        //---------------- accessing data from textures ---------------------------------
        float deltaX = 1.0 / u_textureSize[0];
        float deltaY = 1.0 / u_textureSize[1];
        vec4 huv_t         = texture( u_huvTexture_initial,   v_textureCoord                     );
        vec4 huv_tdelta    = texture( u_huvTexture_naiveProp, v_textureCoord                     );
        vec4 huv_tdelta_px = texture( u_huvTexture_naiveProp, v_textureCoord + vec2( deltaX, 0 ) );
        vec4 huv_tdelta_mx = texture( u_huvTexture_naiveProp, v_textureCoord - vec2( deltaX, 0 ) );
        vec4 huv_tdelta_py = texture( u_huvTexture_naiveProp, v_textureCoord + vec2( 0, deltaY ) );
        vec4 huv_tdelta_my = texture( u_huvTexture_naiveProp, v_textureCoord - vec2( 0, deltaY ) );
        vec4 H00           = texture( u_HTexture,             v_textureCoord                     );
        float hMin        = u_hRange[0];
        float hMax        = u_hRange[1];
        float uMin        = u_uRange[0];
        float uMax        = u_uRange[1];
        float vMin        = u_vRange[0];
        float vMax        = u_vRange[1];
        float h_t         = huv_t[0];
        float u_t         = huv_t[1];
        float v_t         = huv_t[2];
        float h_tdelta    = huv_tdelta[0];
        float u_tdelta    = huv_tdelta[1];
        float v_tdelta    = huv_tdelta[2];
        float h_tdelta_px = huv_tdelta_px[0];
        float h_tdelta_mx = huv_tdelta_mx[0];
        float h_tdelta_py = huv_tdelta_py[0];
        float h_tdelta_my = huv_tdelta_my[0];
        float u_tdelta_px = huv_tdelta_px[1];
        float u_tdelta_mx = huv_tdelta_mx[1];
        float v_tdelta_py = huv_tdelta_px[2];
        float v_tdelta_my = huv_tdelta_mx[2];
        float H           = H00[0];
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

        // 3. improved euler: mean of t and t+delta differentials
        float hNew = h_t + dt * (dhdt_t + dhdt_tdelta) / 2.0;
        float uNew = u_t + dt * (dudt_t + dudt_tdelta) / 2.0;
        float vNew = v_t + dt * (dvdt_t + dvdt_tdelta) / 2.0;
        //--------------------------------------------------------------------------------


        //---------------- compressing values down to texture-value-range ----------------
        float hTex = hNew;
        float uTex = uNew;
        float vTex = vNew;
        if (v_textureCoord.x > 0.95 || v_textureCoord.x < 0.05 || v_textureCoord.y > 0.95 || v_textureCoord.y < 0.05) {
            hTex = 0.0;
            uTex = 0.0;
            vTex = 0.0;
        }
        if (u_doRender > 0.5) {
            hTex = (hTex - hMin) / (hMax - hMin);
            uTex = (uTex - uMin) / (uMax - uMin);
            vTex = (vTex - vMin) / (vMax - vMin);
        }
        //---------------------------------------------------------------------------------

        fragColor = vec4(hTex, uTex, vTex, 1.0);
    }
`);


export class SweRenderer {

    private naiveEuler: Bundle;
    private improvedEuler: Bundle;
    private context: Context;
    private naiveEulerOut: FramebufferObject;
    private augmentedEulerOut0: FramebufferObject;
    private augmentedEulerOut1: FramebufferObject;
    private i = 0;
    
    constructor( outputCanvas: HTMLCanvasElement ) {
        const w = 256;
        const h = 256;

        const HData = [];
        const huvData = [];
        for (let r = 0; r < h; r++) {
            HData.push([]);
            huvData.push([]);
            for (let c = 0; c < w; c++) {
                HData[r].push([100.0, 0, 0, 1.0]);
                // if ( Math.abs(r - w/2) < 3 && Math.abs(c - h/2) < 3 ) {
                //     huvData[r].push([1, 0, 0, 1.0]);
                if (Math.abs(r - w/2) < 3) {
                    huvData[r].push([1, 0, 0, 1.0]);
                } else {
                    huvData[r].push([0, 0, 0, 1.0]);
                }
            }
        }
  

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
            'u_dt':          new UniformData('float', [0.00005]),
            'u_dx':          new UniformData('float', [0.01]),
            'u_dy':          new UniformData('float', [0.01]),
        };

        this.context = new Context(outputCanvas.getContext('webgl2', {preserveDrawingBuffer: true}), true);
        
        this.naiveEuler = new ArrayBundle(
            eulerPropagation, 
            vertexData, 
            uniformData, 
            {
                'u_huvTexture': new TextureData(huvData, 'float4'),
                'u_HTexture':   new TextureData(HData, 'float4'),
            }, 
            'triangles', 
            rect.vertices.length
        );

        this.improvedEuler = new ArrayBundle(
            improvedEulerPropagation,
            vertexData,
            {
                ... uniformData,
                'u_hRange':   new UniformData('vec2', [-5.0, 5.0]),
                'u_uRange':   new UniformData('vec2', [-5.0, 5.0]),
                'u_vRange':   new UniformData('vec2', [-5.0, 5.0]),
                'u_doRender': new UniformData('float', [0.0])
            },
            {
                'u_huvTexture_initial':   new TextureData(huvData, 'float4'),
                'u_huvTexture_naiveProp': new TextureData(huvData, 'float4'),
                'u_HTexture':             new TextureData(HData, 'float4'),
            },
            'triangles',
            rect.vertices.length
        );

        const ext = this.context.gl.getExtension("EXT_color_buffer_float");
        if (!ext) {
          alert("need EXT_color_buffer_float");
          return;
        }
        this.augmentedEulerOut0 = createEmptyFramebufferObject(this.context.gl, w, h, 'float4', 'data');
        this.augmentedEulerOut1 = createEmptyFramebufferObject(this.context.gl, w, h, 'float4', 'data');
        this.naiveEulerOut      = createEmptyFramebufferObject(this.context.gl, w, h, 'float4', 'data');

        //------- binding shaders and first draw ----------------------------------------------------------------------
        this.naiveEuler.upload(this.context);
        this.naiveEuler.initVertexArray(this.context);
        this.naiveEuler.bind(this.context);
        this.naiveEuler.draw(this.context, [0, 0, 0, 0], this.naiveEulerOut);
    
        this.improvedEuler.upload(this.context);
        this.improvedEuler.initVertexArray(this.context);
        this.improvedEuler.bind(this.context);
        this.improvedEuler.updateTextureData(this.context, 'u_huvTexture_naiveProp', this.naiveEulerOut.texture);
        this.improvedEuler.draw(this.context, [0, 0, 0, 0], this.augmentedEulerOut0);
        //--------------------------------------------------------------------------------------------------------------
    }

    
    public render() {
        //-------- first draw: to fb, as to update the source texture for next iteration ----------------
        if (this.i % 2 === 0) {
            this.naiveEuler.bind(this.context);
            this.naiveEuler.updateTextureData(this.context, 'u_huvTexture', this.augmentedEulerOut0.texture);
            this.naiveEuler.draw(this.context, [0, 0, 0, 0], this.naiveEulerOut);
    
            this.improvedEuler.bind(this.context);
            this.improvedEuler.updateUniformData(this.context, 'u_doRender', [0.0]);
            this.improvedEuler.updateTextureData(this.context, 'u_huvTexture_initial',   this.augmentedEulerOut0.texture);
            this.improvedEuler.updateTextureData(this.context, 'u_huvTexture_naiveProp', this.naiveEulerOut.texture);
            this.improvedEuler.draw(this.context, [0, 0, 0, 0], this.augmentedEulerOut1);
        } else {
            this.naiveEuler.bind(this.context);
            this.naiveEuler.updateTextureData(this.context, 'u_huvTexture', this.augmentedEulerOut1.texture);
            this.naiveEuler.draw(this.context, [0, 0, 0, 0], this.naiveEulerOut);
    
            this.improvedEuler.bind(this.context);
            this.improvedEuler.updateUniformData(this.context, 'u_doRender', [0.0]);
            this.improvedEuler.updateTextureData(this.context, 'u_huvTexture_initial',   this.augmentedEulerOut1.texture);
            this.improvedEuler.updateTextureData(this.context, 'u_huvTexture_naiveProp', this.naiveEulerOut.texture);
            this.improvedEuler.draw(this.context, [0, 0, 0, 0], this.augmentedEulerOut0);
        }
        this.i += 1;
        //------------------------------------------------------------------------------------------------

        //-------- second draw: to output-canvas, for visualization --------------------------------------
        this.improvedEuler.updateUniformData(this.context, 'u_doRender', [1.0]);
        this.improvedEuler.draw(this.context, [0, 0, 0, 0]);
        //------------------------------------------------------------------------------------------------
    }

    public getImageData() {
        return getCurrentFramebuffersPixels(this.context.gl.canvas);
    }
}





