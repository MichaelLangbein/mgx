import {
    ArrayBundle, AttributeData, Bundle, Context,
    createEmptyFramebufferObject, FramebufferObject,
    getCurrentFramebuffersPixels, Program, TextureData,
    TextureDataValue,
    UniformData 
} from '../../engine1/src/index';
import { rectangleA } from '../../utils/shapes';


/**
 * --------- TODOs ---------------------------
 * Having these as just classes doesn't seem right.
 * Would be better to have them as mixins, 
 * so that I could combine TextureSwappingRenderer 
 * and ProgramSwappingRenderer
 */


/**
 * Use-case: 
 * I want to render to a fb and then, on the next iteration,
 * use the same fb as input.
 * 
 * Use the following names in your program:
 * ```glsl
 * attribute vec4 a_vertex;
 * attribute vec2 a_textureCoord;
 * varying vec2 v_textureCoord;
 * varying vec2 v_textureCoord;
 * uniform vec2 u_textureSize;
 * ```
 */
export class TextureSwappingRenderer {

    private bundle: Bundle;
    private context: Context;
    private fb1: FramebufferObject;
    private fb2: FramebufferObject;
    private i = 0;

    constructor(
        private outputCanvas: HTMLCanvasElement, 
        program: Program,
        vertexData: {[key: string]: AttributeData},
        uniformData: {[key: string]: UniformData},
        textureData: {[key: string]: TextureData},
        private swappedTextureName: string,
        private storePixels = false
    ) {
        if (!(this.swappedTextureName in textureData)) {
            throw Error(`The swapping texture '${this.swappedTextureName}' could not be found in the provided textureData objects`);
        }

        let w: number, h: number;
        const texData = textureData[this.swappedTextureName].data;
        if (texData instanceof HTMLImageElement || texData instanceof HTMLCanvasElement) {
            w = texData.width;
            h = texData.height;
        } else if (Array.isArray(texData)) {
            w = texData.length;
            h = texData[0].length;
        } else {
            throw Error(`Datatype not yet implemented: ${texData}`);
        }

        this.outputCanvas.width = w;
        this.outputCanvas.height = h;

        const rect = rectangleA(2, 2);
        
        const fullVertexData = {
            'a_vertex': new AttributeData(new Float32Array(rect.vertices.flat()), 'vec4', false),
            'a_textureCoord': new AttributeData(new Float32Array(rect.texturePositions.flat()), 'vec2', false),
            ... vertexData
        };
        
        const fullUniformData = {
            'u_textureSize': new UniformData('vec2', [w, h]),
            ... uniformData
        };
        
        const fullTextureData = {
            ... textureData
        };
        
        this.bundle = new ArrayBundle(
            program, fullVertexData, fullUniformData, fullTextureData, 'triangles', rect.vertices.length);

        this.context = new Context(this.outputCanvas.getContext('webgl', {preserveDrawingBuffer: this.storePixels}), true);
        this.fb1 = createEmptyFramebufferObject(this.context.gl, w, h, 'ubyte4', 'data');
        this.fb2 = createEmptyFramebufferObject(this.context.gl, w, h, 'ubyte4', 'data');
    }

    public init() {
        this.bundle.upload(this.context);
        this.bundle.initVertexArray(this.context);
        this.bundle.bind(this.context);
        // 0th draw: preparing data on fb1
        this.bundle.draw(this.context, [0, 0, 0, 0], this.fb1);
    }
    
    public render() {
        // first draw: to fb, so as to update the source texture for the next iteration
        if (this.i % 2 === 0) {
            this.bundle.updateTextureData(this.context, this.swappedTextureName, this.fb1.texture);
            this.bundle.draw(this.context, [0, 0, 0, 0], this.fb2);
        } else {
            this.bundle.updateTextureData(this.context, this.swappedTextureName, this.fb2.texture);
            this.bundle.draw(this.context, [0, 0, 0, 0], this.fb1);
        }
        this.i += 1;

        // second draw: to output-canvas, for visualization
        this.bundle.draw(this.context, [0, 0, 0, 0]);

    }

    public getImageData() {
        if (this.storePixels) {
            return getCurrentFramebuffersPixels(this.context.gl.canvas);
        } else {
            console.warn('Cannot get image data: storePixels has been set to false');
        }
    }
}

/**
 * Use-case:
 * I want to use one program to render to a fb and then,
 * on the next iteration, use another program with fb as input.
 */
export class ProgramSwappingRenderer {

}



/**
 * Use-case:
 * I want to do a numerical simulation in 2d
 * using Runge-Kutta(4) differentials.
 *
 * ## Note:
 * dt <--- set dt for stability: https://nbviewer.org/github/barbagroup/CFDPython/blob/master/lessons/03_CFL_Condition.ipynb
 */
export class RungeKuttaRenderer {

    private differentialBundle: ArrayBundle;
    private mergingBundle: ArrayBundle;
    private dataFb0: FramebufferObject;
    private dataFb1: FramebufferObject;
    private k1Fb: FramebufferObject;
    private k2Fb: FramebufferObject;
    private k3Fb: FramebufferObject;
    private k4Fb: FramebufferObject;
    private context: Context;
    private i = 0;

    constructor(
        canvas: HTMLCanvasElement,
        data: TextureDataValue,
        dt: number,
        differentialShaderCode: string,
        rgbRanges: RgbRanges,
        userProvidedTextures: {[key: string]: TextureData} = {},
    ) {

        let w; let h;
        if (Array.isArray(data)) {
            w = data.length;
            h = data[0].length;
        } else if (data instanceof HTMLImageElement || data instanceof HTMLCanvasElement) {
            w = data.width;
            h = data.height;
        } else {
            w = data.width;
            h = data.height;
        }
        canvas.width = w;
        canvas.height = h;

        this.context = new Context(canvas.getContext('webgl', { preserveDrawingBuffer: true }), true);
        this.dataFb0 = createEmptyFramebufferObject(this.context.gl, w, h, 'float4', 'data');
        this.dataFb1 = createEmptyFramebufferObject(this.context.gl, w, h, 'float4', 'data');
        this.k1Fb =    createEmptyFramebufferObject(this.context.gl, w, h, 'float4', 'data');
        this.k2Fb =    createEmptyFramebufferObject(this.context.gl, w, h, 'float4', 'data');
        this.k3Fb =    createEmptyFramebufferObject(this.context.gl, w, h, 'float4', 'data');
        this.k4Fb =    createEmptyFramebufferObject(this.context.gl, w, h, 'float4', 'data');

        const rect = rectangleA(2, 2);

        let userProvidedTexturesStringified = '';
        for (const tName in userProvidedTextures) {
            userProvidedTexturesStringified += ` uniform sampler2D ${tName}; `;
        }

        this.differentialBundle = new ArrayBundle(
            new Program(/*glsl*/`
                precision mediump float;
                attribute vec4 a_vertex;
                attribute vec2 a_textureCoord;
                varying vec2 v_textureCoord;
                
                void main() {
                    v_textureCoord = a_textureCoord;
                    gl_Position = a_vertex;  
                }
            `, /*glsl*/`
                precision mediump float;
                varying vec2 v_textureCoord;
                uniform float u_dt;
                uniform float u_kFactor;
                uniform vec2 u_textureSize;
                uniform sampler2D u_dataTexture;
                uniform sampler2D u_kTexture;
                ${ userProvidedTexturesStringified }


                void main() {

                    vec2 deltaX = vec2(1.0 / u_textureSize.x, 0.0);
                    vec2 deltaY = vec2(0.0, 1.0 / u_textureSize.y);
                    vec4 data    = texture2D(u_dataTexture, v_textureCoord          ) + u_dt * u_kFactor * texture2D(u_kTexture, v_textureCoord          );
                    vec4 data_px = texture2D(u_dataTexture, v_textureCoord + deltaX ) + u_dt * u_kFactor * texture2D(u_kTexture, v_textureCoord + deltaX );
                    vec4 data_mx = texture2D(u_dataTexture, v_textureCoord - deltaX ) + u_dt * u_kFactor * texture2D(u_kTexture, v_textureCoord - deltaX );
                    vec4 data_py = texture2D(u_dataTexture, v_textureCoord + deltaY ) + u_dt * u_kFactor * texture2D(u_kTexture, v_textureCoord + deltaY );
                    vec4 data_my = texture2D(u_dataTexture, v_textureCoord - deltaY ) + u_dt * u_kFactor * texture2D(u_kTexture, v_textureCoord - deltaY );

                    //------------------ replace this section with your own, custom code --------------------------------------------------
                    ${differentialShaderCode}
                    //---------------------------------------------------------------------------------------------------------------------
                }
            `),
            {
                'a_vertex':       new AttributeData(new Float32Array(rect.vertices.flat()), 'vec4', false),
                'a_textureCoord': new AttributeData(new Float32Array(rect.texturePositions.flat()), 'vec2', false),
            }, {
                'u_dt':           new UniformData('float', [dt]),
                'u_kFactor':      new UniformData('float', [0.0]),
                'u_textureSize':  new UniformData('vec2', [w, h]),
            }, {
                'u_dataTexture':  new TextureData(data, 'float4'),
                'u_kTexture':     new TextureData(data, 'float4'),
                ... userProvidedTextures
            },
            'triangles',
            rect.vertices.length
        );

        this.mergingBundle = new ArrayBundle(
            new Program(/*glsl*/`
                precision mediump float;
                attribute vec4 a_vertex;
                attribute vec2 a_textureCoord;
                varying vec2 v_textureCoord;
                
                void main() {
                    v_textureCoord = a_textureCoord;
                    gl_Position = a_vertex;  
                }
            `, /*glsl*/`
                precision mediump float;
                varying vec2 v_textureCoord;
                uniform sampler2D u_dataTexture;
                uniform sampler2D u_k1;
                uniform sampler2D u_k2;
                uniform sampler2D u_k3;
                uniform sampler2D u_k4;
                uniform float u_dt;
                uniform vec2 u_RRange;
                uniform vec2 u_GRange;
                uniform vec2 u_BRange;
                uniform float u_toCanvas;

                void main() {

                    vec4 data = texture2D(u_dataTexture, v_textureCoord);
                    vec4 k1   = texture2D(u_k1,          v_textureCoord);
                    vec4 k2   = texture2D(u_k2,          v_textureCoord);
                    vec4 k3   = texture2D(u_k3,          v_textureCoord);
                    vec4 k4   = texture2D(u_k4,          v_textureCoord);

                    vec4 weightedAverage = data + u_dt * (k1 + 2.0 * k2 + 2.0 * k3 + k4) / 6.0;

                    if (u_toCanvas > 0.5) {
                        float rNorm = (weightedAverage.x - u_RRange[0]) / (u_RRange[1] - u_RRange[0]);
                        float gNorm = (weightedAverage.y - u_GRange[0]) / (u_GRange[1] - u_GRange[0]);
                        float bNorm = (weightedAverage.z - u_BRange[0]) / (u_BRange[1] - u_BRange[0]);
                        gl_FragColor = vec4(rNorm, gNorm, bNorm, 1.0);
                    } else {
                        gl_FragColor = weightedAverage;
                    }
                }
            `),
            {
                'a_vertex':       new AttributeData(new Float32Array(rect.vertices.flat()), 'vec4', false),
                'a_textureCoord': new AttributeData(new Float32Array(rect.texturePositions.flat()), 'vec2', false)
            }, {
                'u_dt':           new UniformData('float', [dt]),
                'u_toCanvas':     new UniformData('float', [0.0]),
                'u_RRange':       new UniformData('vec2', [rgbRanges['r'][0], rgbRanges['r'][1]]),
                'u_GRange':       new UniformData('vec2', [rgbRanges['g'][0], rgbRanges['g'][1]]),
                'u_BRange':       new UniformData('vec2', [rgbRanges['b'][0], rgbRanges['b'][1]]),
            }, {
                'u_dataTexture':  new TextureData(data,              'float4'),
                'u_k1':           new TextureData(this.k1Fb.texture, 'float4'),
                'u_k2':           new TextureData(this.k2Fb.texture, 'float4'),
                'u_k3':           new TextureData(this.k3Fb.texture, 'float4'),
                'u_k4':           new TextureData(this.k4Fb.texture, 'float4'),
            },
            'triangles',
            rect.vertices.length
        );


        this.differentialBundle.upload(this.context);
        this.differentialBundle.initVertexArray(this.context);
        this.differentialBundle.bind(this.context);

        this.differentialBundle.updateUniformData(this.context, 'u_kFactor', [0.0]);
        // this.differentialBundle.updateTextureData(this.context, 'u_dataTexture', dataSource.texture);
        this.differentialBundle.draw(this.context, [0, 0, 0, 0], this.k1Fb);

        this.differentialBundle.updateUniformData(this.context, 'u_kFactor', [0.5]);
        this.differentialBundle.updateTextureData(this.context, 'u_kTexture', this.k1Fb.texture);
        this.differentialBundle.draw(this.context, [0, 0, 0, 0], this.k2Fb);

        this.differentialBundle.updateUniformData(this.context, 'u_kFactor', [0.5]);
        this.differentialBundle.updateTextureData(this.context, 'u_kTexture', this.k2Fb.texture);
        this.differentialBundle.draw(this.context, [0, 0, 0, 0], this.k3Fb);

        this.differentialBundle.updateUniformData(this.context, 'u_kFactor', [1.0]);
        this.differentialBundle.updateTextureData(this.context, 'u_kTexture', this.k3Fb.texture);
        this.differentialBundle.draw(this.context, [0, 0, 0, 0], this.k4Fb);
        
        this.mergingBundle.upload(this.context);
        this.mergingBundle.initVertexArray(this.context);
        this.mergingBundle.bind(this.context);

        this.mergingBundle.updateUniformData(this.context, 'u_toCanvas', [0.0]);
        // this.mergingBundle.updateTextureData(this.context, 'u_dataTexture', dataSource.texture);
        this.mergingBundle.updateTextureData(this.context, 'u_k1',          this.k1Fb.texture);
        this.mergingBundle.updateTextureData(this.context, 'u_k2',          this.k2Fb.texture);
        this.mergingBundle.updateTextureData(this.context, 'u_k3',          this.k3Fb.texture);
        this.mergingBundle.updateTextureData(this.context, 'u_k4',          this.k4Fb.texture);
        this.mergingBundle.draw(this.context, [0, 0, 0, 0], this.dataFb0);

        this.mergingBundle.draw(this.context, [0, 0, 0, 0]);
    }

    render(alsoDrawToCanvas = false) {
        //----------------------- Step 0: swapping source- and target-textures ---------------------------
        let dataSource;
        let dataTarget;
        if (this.i % 2 === 0) {
            dataSource = this.dataFb0;
            dataTarget = this.dataFb1;
        } else {
            dataSource = this.dataFb1;
            dataTarget = this.dataFb0;
        }
        this.i += 1;
        //-------------------------------------------------------------------------------------------------


        //-------------------- Step 1: 4 runs to approximate the differential at different times ----------
        this.differentialBundle.bind(this.context);
        
        this.differentialBundle.updateUniformData(this.context, 'u_kFactor', [0.0]);
        this.differentialBundle.updateTextureData(this.context, 'u_dataTexture', dataSource.texture);
        this.differentialBundle.draw(this.context, [0, 0, 0, 0], this.k1Fb);

        this.differentialBundle.updateUniformData(this.context, 'u_kFactor', [0.5]);
        this.differentialBundle.updateTextureData(this.context, 'u_kTexture', this.k1Fb.texture);
        this.differentialBundle.draw(this.context, [0, 0, 0, 0], this.k2Fb);

        this.differentialBundle.updateUniformData(this.context, 'u_kFactor', [0.5]);
        this.differentialBundle.updateTextureData(this.context, 'u_kTexture', this.k2Fb.texture);
        this.differentialBundle.draw(this.context, [0, 0, 0, 0], this.k3Fb);

        this.differentialBundle.updateUniformData(this.context, 'u_kFactor', [1.0]);
        this.differentialBundle.updateTextureData(this.context, 'u_kTexture', this.k3Fb.texture);
        this.differentialBundle.draw(this.context, [0, 0, 0, 0], this.k4Fb);
        //------------------------------------------------------------------------------------------------


        //----------------- Step 2: weighted average of the 4 runs ---------------------------------------
        this.mergingBundle.bind(this.context);
        this.mergingBundle.updateUniformData(this.context, 'u_toCanvas', [0.0]);
        this.mergingBundle.updateTextureData(this.context, 'u_dataTexture', dataSource.texture);
        this.mergingBundle.updateTextureData(this.context, 'u_k1',          this.k1Fb.texture);
        this.mergingBundle.updateTextureData(this.context, 'u_k2',          this.k2Fb.texture);
        this.mergingBundle.updateTextureData(this.context, 'u_k3',          this.k3Fb.texture);
        this.mergingBundle.updateTextureData(this.context, 'u_k4',          this.k4Fb.texture);
        this.mergingBundle.draw(this.context, [0, 0, 0, 0], dataTarget);
        //-------------------------------------------------------------------------------------------------
        

        //----------------- Step 3: drawing to canvas -----------------------------------------------------
        if (alsoDrawToCanvas) {
            this.mergingBundle.updateUniformData(this.context, 'u_toCanvas', [1.0]);
            this.mergingBundle.draw(this.context, [0, 0, 0, 0]);
        }
        //-------------------------------------------------------------------------------------------------
    }

    public getImageData() {
        return getCurrentFramebuffersPixels(this.context.gl.canvas);
    }

    public updateTexture(textureName: string, newData: TextureDataValue) {
        this.differentialBundle.updateTextureData(this.context, textureName, newData);
    }
}

export interface RgbRanges {
    'r': [number, number],
    'g': [number, number],
    'b': [number, number],
}
