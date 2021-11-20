import {
    ArrayBundle, AttributeData, Bundle, Context,
    createEmptyFramebufferObject, FramebufferObject,
    getCurrentFramebuffersPixels, Program, TextureData,
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
        this.fb1 = createEmptyFramebufferObject(this.context.gl, w, h, 'data');
        this.fb2 = createEmptyFramebufferObject(this.context.gl, w, h, 'data');
    }

    public init() {
        this.bundle.upload(this.context);
        this.bundle.initVertexArray(this.context);
        this.bundle.bind(this.context);
        // 0th draw: preparing data on fb1
        this.bundle.draw(this.context, [0, 0, 0, 0], this.fb1);
    }
    
    public render() {
        // first draw: to fb, as to update the source texture for next iteration
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


