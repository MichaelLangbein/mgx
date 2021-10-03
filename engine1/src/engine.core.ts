/**
 * This code was first developed [here](https://github.com/michaellangbein/webglexperiments)
 * It has been further developed [here](https://github.com/dlr-eoc/ukis-frontend-libraries) 
 * Since then, modifications have been made to the code. (with this we comply with Apache-2.0 $4.b)
 * The original license from https://github.com/dlr-eoc/ukis-frontend-libraries can be found in this repo as `license.orig.txt` (with this we comply with Apache-2.0 $4.a)
 */


import { bindIndexBuffer, bindProgram, bindTextureToUniform, bindValueToUniform, BufferObject, createBuffer,
    createIndexBuffer, createShaderProgram, createTexture, drawArray, drawElements, getAttributeLocation,
    getUniformLocation, IndexBufferObject, TextureObject, WebGLUniformType, drawElementsInstanced, drawArrayInstanced,
    GlDrawingMode, bindVertexArray, createVertexArray, VertexArrayObject, bindBufferToAttributeVertexArray,
    bindBufferToAttributeInstancedVertexArray, updateBufferData, updateTexture, FramebufferObject,
    bindOutputCanvasToFramebuffer, bindFramebuffer, clearBackground, WebGLAttributeType, createDataTexture, TextureType, bindTextureToFramebuffer} from './webgl';




// dead-simple hash function - not intended to be secure in any way.
const hash = function(s: string): string {
    let h = 0;
    for (const c of s) {
        h += c.charCodeAt(0);
    }
    return `${h}`;
};


function parseProgram(program: Program): [string[], string[], string[], string[]] {
    const attributeRegex = /^\s*attribute (int|float|vec2|vec3|vec4|mat2|mat3|mat4) (\w*);/gm;
    const uniformRegex = /^\s*uniform (int|float|vec2|vec3|vec4|mat2|mat3|mat4) (\w*)(\[\d\])*;/gm;
    const textureRegex = /^\s*uniform sampler2D (\w*);/gm;
    const precisionRegex = /^\s*precision (\w*) float;/gm;

    const shaderCode = program.fragmentShaderSource + '\n\n\n' + program.vertexShaderSource;

    const attributeNames = [];
    let attributeMatches;
    while ((attributeMatches = attributeRegex.exec(shaderCode)) !== null) {
        attributeNames.push(attributeMatches[2]);
    }
    const uniformNames = [];
    let uniformMatches;
    while ((uniformMatches = uniformRegex.exec(shaderCode)) !== null) {
        uniformNames.push(uniformMatches[2]);
    }
    const textureNames = [];
    let textureMatches;
    while ((textureMatches = textureRegex.exec(shaderCode)) !== null) {
        textureNames.push(textureMatches[1]);
    }

    const precisions = [];
    let precisionMatches;
    while ((precisionMatches = precisionRegex.exec(shaderCode)) !== null) {
        precisions.push(precisionMatches[1]);
    }

    return [attributeNames, uniformNames, textureNames, precisions];
}

function checkDataProvided(
    program: Program,
    attributes: {[k: string]: AttributeData},
    uniforms: {[k: string]: UniformData},
    textures: {[k: string]: TextureData},
    ) {
    const [attributeNames, uniformNames, textureNames, precisions] = parseProgram(program);
    for (const attrName of attributeNames) {
        if (!attributes[attrName]) {
            throw new Error(`Provided no values for shader's attribute ${attrName}.`);
        }
    }
    for (const uniformName of uniformNames) {
        if (!uniforms[uniformName]) {
            throw new Error(`Provided no values for shader's uniform ${uniformName}.`);
        }
    }
    for (const texName of textureNames) {
        if (!textures[texName]) {
            throw new Error(`Provided no values for shader's texture ${texName}.`);
        }
    }
    if (precisions.length === 1) {
        console.warn(`You have only provided one precision qualifier.
        This can cause issues when you want to use a uniform in both the vertex- and the fragment-shader.`);
    }
    // // @TODO: the below code does not account for instanced attributes.
    // const lengths = Object.values(attributes).map(a => a.data.length);
    // if (Math.min(...lengths) !== Math.max(...lengths)) {
    //     throw new Error(`Your attributes are not of the same length!`);
    // }
}

interface IAttributeData {
    hash: string;
    changesOften: boolean;
    attributeType: WebGLAttributeType;
    data: Float32Array;
    buffer: BufferObject;
    upload (gl: WebGLRenderingContext): void;
    bind (gl: WebGLRenderingContext, location: number, va: VertexArrayObject): VertexArrayObject;
    update (gl: WebGLRenderingContext, newData: Float32Array): void;
}


/**
 * Data container.
 * Abstracts all webgl-calls to attribute-api.
 * Maintains copy of data locally, so it can be up- and unloaded by context
 * without losing the original data.
 */
export class AttributeData implements IAttributeData {

    readonly hash: string;
    changesOften: boolean;
    attributeType: WebGLAttributeType;
    data: Float32Array;    // raw data, user-provided
    buffer: BufferObject;  // buffer on gpu
    constructor(data: Float32Array, attrType: WebGLAttributeType, changesOften: boolean) {
        this.data = data;
        this.attributeType = attrType;
        this.changesOften = changesOften;
        this.hash = hash(data + '' + attrType + changesOften + Math.random());
    }

    upload(gl: WebGLRenderingContext) {
        this.buffer = createBuffer(gl, this.attributeType, this.data, this.changesOften);
    }

    bind(gl: WebGLRenderingContext, location: number, va: VertexArrayObject) {
        if (!this.buffer) {
            throw Error(`No value set for AttributeData`);
        }
        va = bindBufferToAttributeVertexArray(gl, location, this.buffer, va);
        return va;
    }

    update(gl: WebGLRenderingContext, newData: Float32Array) {
        this.data = newData;
        this.buffer = updateBufferData(gl, this.buffer, this.data);
    }

}

/**
 * Like `AttributeData`, but expects there to be `nrInstances` times as many values.
 * That is, for a `vec2` with `nrInstances=4`, you'd pass 4 * 2 = 8 values.
 */
export class InstancedAttributeData implements IAttributeData {

    readonly hash: string;
    attributeType: WebGLAttributeType;
    changesOften: boolean;
    data: Float32Array;      // raw data, user-provided
    buffer: BufferObject;  // buffer on gpu
    /**
     * Number of instances that will be rotated through before moving along one step of this buffer.
     * I.e. each entry in this buffer remains the same for `nrInstances` instances,
     * that is, for `nrInstances * data.length` vertices.
     */
    nrInstances: number;
    constructor(data: Float32Array, attrType: WebGLAttributeType, changesOften: boolean, nrInstances: number) {
        this.data = data;
        this.attributeType = attrType;
        this.changesOften = changesOften;
        this.nrInstances = nrInstances;
        this.hash = hash(data + '' + attrType + changesOften + nrInstances);
    }

    upload(gl: WebGLRenderingContext) {
        this.buffer = createBuffer(gl, this.attributeType, this.data, this.changesOften);
    }

    bind(gl: WebGLRenderingContext, location: number, va: VertexArrayObject) {
        if (!this.buffer) {
            throw Error(`No value set for AttributeData`);
        }
        va = bindBufferToAttributeInstancedVertexArray(gl, location, this.buffer, this.nrInstances, va);
        return va;
    }

    update(gl: WebGLRenderingContext, newData: Float32Array) {
        this.data = newData;
        this.buffer = updateBufferData(gl, this.buffer, this.data);
    }
}


/**
 * Data container.
 * Abstracts all webgl-calls to uniform-api.
 * Maintains copy of data locally, so it can be up- and unloaded by context
 * without losing the original data.
 */
export class UniformData {

    hash: string;
    value: number[];
    uniformType: WebGLUniformType;
    constructor(type: WebGLUniformType, value: number[]) {
        this.uniformType = type;
        this.value = value;
        this.hash = hash(value + '' + type);
    }

    upload(gl: WebGLRenderingContext) {
        // uniforms are always uploaded directly, without a buffer.
        // (In WebGL2, however, there *are* uniform-buffers!)
    }

    bind(gl: WebGLRenderingContext, location: WebGLUniformLocation) {
        bindValueToUniform(gl, location, this.uniformType, this.value);
    }

    update(gl: WebGLRenderingContext, newData: number[], location: WebGLUniformLocation) {
        this.value = newData;
        this.bind(gl, location);
    }
}


export type TextureDataValue = TextureObject | HTMLImageElement | HTMLCanvasElement | number[][][];

/**
 * Data container.
 * Abstracts all webgl-calls to texture-api.
 * Maintains copy of data locally, so it can be up- and unloaded by context
 * without losing the original data.
 */
export class TextureData {

    hash: string;
    data: TextureDataValue;             // raw data, user-provided
    texture: TextureObject;              // buffer on gpu
    textureDataType: TextureType;
    constructor(im: TextureDataValue, textureDataType?: TextureType) {
        this.data = im;
        this.hash = hash(Math.random() * 1000 + ''); // @TODO: how do you hash textures?
        this.textureDataType = textureDataType;
    }

    upload(gl: WebGLRenderingContext) {
        if (this.data instanceof HTMLImageElement || this.data instanceof  HTMLCanvasElement) {
            this.texture = createTexture(gl, this.data);
        } else if (this.data instanceof Array) {
            this.texture = createDataTexture(gl, this.data, this.textureDataType);
        } else {
            this.texture = this.data;
        }
    }

    bind(gl: WebGLRenderingContext, location: WebGLUniformLocation, bindPoint: number) {
        if (!this.texture) {
            throw new Error(`No texture for TextureData`);
        }
        bindTextureToUniform(gl, this.texture.texture, bindPoint, location);
    }

    /**
     * In case you're passing a new `TextureObject`: don't forget to call `TextureData.bind(gl, location, bp)`
     */
    update(gl: WebGLRenderingContext, newData: TextureDataValue): TextureObject {
        this.data = newData;
        const oldTo = this.texture;
        if ((newData as TextureObject).texture) { // if (newData instanceof TextureObject) {
            this.texture = newData as TextureObject;
        } else {
            this.texture = updateTexture(gl, this.texture, newData as HTMLImageElement | HTMLCanvasElement | number[][][]);
        }
        return oldTo;
    }
}

/**
 * Data container.
 * Abstracts all webgl-calls to index-api.
 * Maintains copy of data locally, so it can be up- and unloaded by context
 * without losing the original data.
 */
export class Index {

    data: Uint16Array;             // raw data, user-provided
    index: IndexBufferObject;     // buffer on gpu
    constructor(indices: Uint16Array) {
        this.data = indices;
    }

    upload(gl: WebGLRenderingContext) {
        this.index = createIndexBuffer(gl, this.data);
    }

    bind(gl: WebGLRenderingContext) {
        if (!this.index) {
            throw new Error(`Index: indexBufferObject has not yet been uploaded.`);
        }
        bindIndexBuffer(gl, this.index);
    }

    update(data: Uint16Array) {
        this.data = data;
    }
}




/**
 * Container for a WebGLProgram - contains the vertex- and the fragment-shader-code.
 */
export class Program {

    program: WebGLProgram;
    readonly hash: string;
    uniformLocations: {[uName: string]: WebGLUniformLocation};
    attributeLocations: {[aName: string]: number};

    constructor(
        readonly vertexShaderSource: string,
        readonly fragmentShaderSource: string) {
            this.attributeLocations = {};
            this.uniformLocations = {};
            this.hash = hash(vertexShaderSource + fragmentShaderSource);
    }

    upload(gl: WebGLRenderingContext) {
        this.program = createShaderProgram(gl, this.vertexShaderSource, this.fragmentShaderSource);
    }

    bind(gl: WebGLRenderingContext) {
        if (!this.program) {
            this.upload(gl);
        }
        bindProgram(gl, this.program);
    }

    getUniformLocation(gl: WebGLRenderingContext, uName: string) {
        if (!this.uniformLocations[uName]) {
            const location = getUniformLocation(gl, this.program, uName);
            this.uniformLocations[uName] = location;
        }
        return this.uniformLocations[uName];
    }

    getAttributeLocation(gl: WebGLRenderingContext, aName: string) {
        if (!this.attributeLocations[aName]) {
            const location = getAttributeLocation(gl, this.program, aName);
            this.attributeLocations[aName] = location;
        }
        return this.attributeLocations[aName];
    }

    getTextureLocation(gl: WebGLRenderingContext, tName: string) {
        return this.getUniformLocation(gl, tName);
    }
}



/**
 * Context: a wrapper around WebGLRenderingContext.
 * Intercepts calls to upload, bind etc.
 * and checks if the data is *already* uploaded, bound, etc.
 * Saves on calls.
 *
 * @TODO: also wrap around bind-calls and vertex-arrays.
 * @TODO: check for overloading too many textures.
 */
export class Context {

    private loadedPrograms: string[] = [];
    private loadedAttributes: string[] = [];
    private loadedUniforms: string[] = [];
    private loadedTextures: string[] = [];

    constructor(readonly gl: WebGLRenderingContext, private verbose = false) {}

    uploadProgram(prog: Program): void {
        if (!this.loadedPrograms.includes(prog.hash)) {
            prog.upload(this.gl);
            this.loadedPrograms.push(prog.hash);
            if (this.verbose) console.log(`Context: uploaded program ${prog.hash}`);
        } else {
            if (this.verbose) console.log(`Context: did not need to upload program ${prog.hash}`);
        }
    }

    uploadAttribute(data: AttributeData): void {
        if (!this.loadedAttributes.includes(data.hash)) {
            data.upload(this.gl);
            this.loadedAttributes.push(data.hash);
            if (this.verbose) console.log(`Context: uploaded attribute ${data.hash}`);
        } else {
            if (this.verbose) console.log(`Context: did not need to upload attribute ${data.hash}`);
        }
    }

    uploadUniform(data: UniformData): void {
        if (!this.loadedUniforms.includes(data.hash)) {
            data.upload(this.gl);
            this.loadedUniforms.push(data.hash);
            if (this.verbose) console.log(`Context: uploaded uniform ${data.hash}`);
        } else {
            if (this.verbose) console.log(`Context: did not need to upload uniform ${data.hash}`);
        }
    }

    uploadTexture(data: TextureData): void {
        if (!this.loadedTextures.includes(data.hash)) {
            data.upload(this.gl);
            this.loadedTextures.push(data.hash);
            if (this.verbose) console.log(`Context: uploaded texture ${data.hash}`);
        } else {
            if (this.verbose) console.log(`Context: did not need to upload texture ${data.hash}`);
        }
    }

    bindFramebuffer(fbo: FramebufferObject): void {
        throw new Error('Not yet implemented');
    }
}


/**
 * Container for a Program together with all related attribute-, uniform-, and texture-data.
 * Handles uploading of all data to the GPU, the binding of that data to the right slots, and the actual rendering.
 */
export abstract class Bundle {
    program: Program;
    attributes: {[k: string]: IAttributeData};
    uniforms: {[k: string]: UniformData};
    textures: {[k: string]: TextureData};
    va: VertexArrayObject;
    drawingMode: GlDrawingMode;

    constructor(
        program: Program,
        attributes: {[k: string]: AttributeData},
        uniforms: {[k: string]: UniformData},
        textures: {[k: string]: TextureData},
        drawingMode: GlDrawingMode = 'triangles'
    ) {
        this.program = program;
        this.attributes = attributes;
        this.uniforms = uniforms;
        this.textures = textures;
        this.drawingMode = drawingMode;
        checkDataProvided(program, attributes, uniforms, textures);
    }

    public upload (context: Context): void {
        context.uploadProgram(this.program);

        for (const attributeName in this.attributes) {
            const data = this.attributes[attributeName];
            context.uploadAttribute(data);
        }

        for (const uniformName in this.uniforms) {
            const data = this.uniforms[uniformName];
            context.uploadUniform(data);
        }

        for (const textureName in this.textures) {
            const data = this.textures[textureName];
            context.uploadTexture(data);
        }
    }

    public initVertexArray(context: Context) {
        this.va = createVertexArray(context.gl);
        bindVertexArray(context.gl, this.va);

        for (const attributeName in this.attributes) {
            const data = this.attributes[attributeName];
            const loc = this.program.getAttributeLocation(context.gl, attributeName);
            this.va = data.bind(context.gl, loc, this.va);
        }
    }

    public bind (context: Context): void {
        bindProgram(context.gl, this.program.program);

        bindVertexArray(context.gl, this.va);

        for (const uniformName in this.uniforms) {
            const data = this.uniforms[uniformName];
            const loc = this.program.getUniformLocation(context.gl, uniformName);
            data.bind(context.gl, loc);
        }

        let bp = 1;
        for (const textureName in this.textures) {
            bp += 1;
            const data = this.textures[textureName];
            const loc = this.program.getTextureLocation(context.gl, textureName);
            data.bind(context.gl, loc, bp);
        }
    }


    public updateAttributeData(context: Context, variableName: string, newData: Float32Array): void {
        const attribute = this.attributes[variableName];
        if (!attribute) {
            throw new Error(`No such attribute ${variableName} to be updated.`);
        }
        attribute.update(context.gl, newData);
    }

    public updateUniformData(context: Context, variableName: string, newData: number[]): void {
        const uniform = this.uniforms[variableName];
        if (!uniform) {
            throw new Error(`No such uniform ${variableName} to be updated.`);
        }
        const location = this.program.getUniformLocation(context.gl, variableName);
        uniform.update(context.gl, newData, location);
    }

    public updateTextureData(context: Context, variableName: string, newImage: TextureDataValue): void {
        const original = this.textures[variableName];
        if (!original) {
            throw new Error(`No such texture ${variableName} to be updated.`);
        }
        original.update(context.gl, newImage);
        this.bind(context);   // @TODO: not sure if this is required here.
    }

    public draw (context: Context, background?: number[], frameBuffer?: FramebufferObject, viewport?: [number, number, number, number]): void {
        if (!frameBuffer) {
            bindOutputCanvasToFramebuffer(context.gl, viewport);
        } else {
            bindFramebuffer(context.gl, frameBuffer, viewport);
        }
        if (background) {
            clearBackground(context.gl, background);
        }
    }

}

/**
 * Use this type of bundle for `gl.drawArrays`-style drawing.
 * Simple, but requires you to keep multiple copies of a vertex if the vertex forms part of more than one triangle.
 */
export class ArrayBundle extends Bundle {
    constructor(
        program: Program,
        attributes: {[k: string]: AttributeData},
        uniforms: {[k: string]: UniformData},
        textures: {[k: string]: TextureData},
        drawingMode: GlDrawingMode = 'triangles',
        readonly nrAttributes: number
    ) {
        super(program, attributes, uniforms, textures, drawingMode);
    }


    draw(context: Context, background?: number[], frameBuffer?: FramebufferObject, viewport?: [number, number, number, number]): void {
        super.draw(context, background, frameBuffer, viewport);
        drawArray(context.gl, this.drawingMode, this.nrAttributes, 0);
    }
}

/**
 * Use this type of bundle for `gl.drawElements`-style drawing.
 * Instead of duplicating vertices that are used in multiple objects (like `ArrayBundle` does),
 * it relies on a `Index` to tell the GPU which vertex to pick next.
 * This way, the GPU doesn't loop a single time through the array of given vertices,
 * but jumps around according to the index. A bit more memory-efficient.
 */
export class ElementsBundle extends Bundle {
    constructor(
        program: Program,
        attributes: {[k: string]: AttributeData},
        uniforms: {[k: string]: UniformData},
        textures: {[k: string]: TextureData},
        drawingMode: GlDrawingMode = 'triangles',
        public index: Index,
    ) {
        super(program, attributes, uniforms, textures, drawingMode);
    }

    upload(context: Context): void {
        super.upload(context);
        this.index.upload(context.gl);
    }

    bind(context: Context): void {
        super.bind(context);
        this.index.bind(context.gl);
    }

    draw(context: Context, background?: number[], frameBuffer?: FramebufferObject, viewport?: [number, number, number, number]): void {
        super.draw(context, background, frameBuffer, viewport);
        this.index.bind(context.gl);
        drawElements(context.gl, this.index.index, this.drawingMode);
    }


    public updateIndex(context: Context, newData: Uint16Array): void {
        this.index.data = newData;

    }
}

/**
 * Like `ArrayBundle`, but for `drawArraysInstancedANGLE`-style drawing.
 * Loops through the given vertices `nrInstances` times.
 * Efficient when you want to draw many instances of the same object,
 * such as hundreds of trees, only with variations in location.
 * Expects that every attribute is also given `nrInstances` times.
 * That is, when using a `attribute mat4` and `nrInstances=3`,
 * requires you to pass in the data for 3 `mat4`-matrices (so, 3 * 16 = 48 values).
 */
export class InstancedArrayBundle extends Bundle {
    constructor(
        program: Program,
        attributes: {[k: string]: IAttributeData},
        uniforms: {[k: string]: UniformData},
        textures: {[k: string]: TextureData},
        drawingMode: GlDrawingMode = 'triangles',
        readonly nrAttributes: number,
        public nrInstances: number
    ) {
        super(program, attributes, uniforms, textures, drawingMode);
    }

    draw(context: Context, background?: number[], frameBuffer?: FramebufferObject, viewport?: [number, number, number, number]): void {
        super.draw(context, background, frameBuffer, viewport);
        drawArrayInstanced(context.gl, this.drawingMode, this.nrAttributes, 0, this.nrInstances);
    }
}

/**
 * Like `ElementsBundle`, but for `drawElementsInstancedANGLE`-style drawing.
 * Loops through the given vertices `nrInstances` times.
 * Efficient when you want to draw many instances of the same object,
 * such as hundreds of trees, only with variations in location.
 * Expects that every attribute is also given `nrInstances` times.
 * That is, when using a `attribute mat4` and `nrInstances=3`,
 * requires you to pass in the data for 3 `mat4`-matrices (so, 3 * 16 = 48 values).
 */
export class InstancedElementsBundle extends Bundle {
    constructor(
        program: Program,
        attributes: {[k: string]: IAttributeData},
        uniforms: {[k: string]: UniformData},
        textures: {[k: string]: TextureData},
        drawingMode: GlDrawingMode = 'triangles',
        public index: Index,
        public nrInstances: number
    ) {
        super(program, attributes, uniforms, textures, drawingMode);
    }

    upload(context: Context): void {
        super.upload(context);
        this.index.upload(context.gl);
    }

    bind(context: Context): void {
        super.bind(context);
        this.index.bind(context.gl);
    }

    draw(context: Context, background?: number[], frameBuffer?: FramebufferObject, viewport?: [number, number, number, number]): void {
        super.draw(context, background, frameBuffer, viewport);
        this.index.bind(context.gl);
        drawElementsInstanced(context.gl, this.index.index, this.drawingMode, this.nrInstances);
    }
}
