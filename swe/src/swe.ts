import { Program, TextureData, UniformData, SwappingRenderer } from '../../engine1/src/index';


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
        //---------------------------------------------------------------------------------


        //---------------- actual calculations ------------------------------------------
        float dudx = (upx - umx) / (2.0 * dx);
        float dvdy = (vpy - vmy) / (2.0 * dy);
        float dhdx = (hpx - hmx) / (2.0 * dx);
        float dhdy = (hpy - hmy) / (2.0 * dy);
        float hNew =      - H * ( dudx + dvdy ) * dt + h;
        float uNew = ( + f*v - b*u - g * dhdx ) * dt + u;
        float vNew = ( - f*u - b*v - g * dhdy ) * dt + v;
        //---------------------------------------------------------------------------------


        //---------------- compressing values down to texture-value-range ----------------
        float hTex = (hNew - hMin) / (hMax - hMin);
        float uTex = (uNew - uMin) / (uMax - uMin);
        float vTex = (vNew - vMin) / (vMax - vMin);
        hTex = max(min(hTex, 1.0), 0.0); 
        uTex = max(min(uTex, 1.0), 0.0);
        vTex = max(min(vTex, 1.0), 0.0);
        //---------------------------------------------------------------------------------

        // gl_FragColor expects values in [0, 1]^4
        // higher/lower values don't rotate,
        // but are truncated instead.
        // Thus: 
        // r=1.5  => r=1.0
        // r=-0.3 => r=0.0
        gl_FragColor = vec4(hTex, uTex, vTex, 1.0);
    }
`);


export class SweRenderer extends SwappingRenderer {
    constructor(
        outputCanvas: HTMLCanvasElement,
        huv: HTMLImageElement, 
        H: HTMLImageElement
    ) {
        super(
            outputCanvas,
            program, {
            }, {
                'u_g':      new UniformData('float', [9.8]),     // https://www.google.com/search?q=gravitational+acceleration+constant&rlz=1C1GCEU_deDE869DE869&sxsrf=AOaemvKhOiXVsEX5hXOYDIVhCqvaO51Ekw%3A1637142341924&ei=Rc-UYa7qN8OyqtsP6fC-4As&oq=gravitational+acc&gs_lcp=Cgdnd3Mtd2l6EAMYATIFCAAQgAQyBQgAEIAEMgUIABCABDIFCAAQgAQyBQgAEMsBMgUIABCABDIFCAAQgAQyBQgAEIAEMgUIABCABDIFCAAQgAQ6BwgAEEcQsAM6BwgAELADEEM6BQgAEJECOgUILhDLAUoECEEYAFDiBFj9B2DuHGgCcAJ4AIABZIgB9wGSAQMyLjGYAQCgAQHIAQrAAQE&sclient=gws-wiz
                'u_b':      new UniformData('float', [0.001]),   // https://en.wikipedia.org/wiki/Drag_(physics)
                'u_f':      new UniformData('float', [0.00528]), // https://www.google.com/search?q=correolis+coefficient+at+45+degrees&rlz=1C1GCEU_deDE869DE869&oq=correolis+coefficient+at+45+degrees&aqs=chrome..69i57j33i22i29i30.12278j0j4&sourceid=chrome&ie=UTF-8
                'u_dt':     new UniformData('float', [0.2]),
                'u_dx':     new UniformData('float', [10000 / huv.width]),
                'u_dy':     new UniformData('float', [10000 / huv.height]),
                'u_hRange': new UniformData('vec2', [-0.1, 0.1]),
                'u_uRange': new UniformData('vec2', [-0.1, 0.1]),
                'u_vRange': new UniformData('vec2', [-0.1, 0.1]),
                'u_HMax':   new UniformData('float', [10])
            }, {
                'u_huvTexture': new TextureData(huv),
                'u_HTexture':   new TextureData(H)
            },
            'u_huvTexture', 
            true
        );
    }

}


