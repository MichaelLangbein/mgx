/**
 * This code was first developed [here](https://github.com/michaellangbein/webglexperiments)
 * It has been further developed [here](https://github.com/dlr-eoc/ukis-frontend-libraries) 
 * Since then, modifications have been made to the code. (with this we comply with Apache-2.0 $4.b)
 * The original license from https://github.com/dlr-eoc/ukis-frontend-libraries can be found in this repo as `license.orig.txt` (with this we comply with Apache-2.0 $4.a)
 */


import { isPowerOf, flatten3 } from '../../utils/math';




export type GlDrawingMode = 'triangles' | 'points' | 'lines';

export type WebGLUniformType  = 'bool'  | 'bvec2' | 'bvec3' | 'bvec4'| 'bool[]'  | 'bvec2[]' | 'bvec3[]' | 'bvec4[]'
                              | 'int'   | 'ivec2' | 'ivec3' | 'ivec4'| 'int[]'   | 'ivec2[]' | 'ivec3[]' | 'ivec4[]'
                              | 'float' | 'vec2'  | 'vec3'  | 'vec4' | 'float[]' | 'vec2[]'  | 'vec3[]'  | 'vec4[]'
                                        | 'mat2'  | 'mat3'  | 'mat4';

export type WebGLAttributeType = 'float' | 'vec2' | 'vec3' | 'vec4' | 'mat2' | 'mat3' | 'mat4';

const shaderInputTextureBindPoint = 0;
const textureConstructionBindPoint = 7;



const extensionCache: {[key: string]: any} = {};

function getExtension(gl: WebGLRenderingContext, name: string) {
    if (name in extensionCache) {
        return extensionCache[name];
    } else {
        const ext = gl.getExtension(name);
        if (!ext) {
            throw Error(`couldn't get extension ${name}`);
        }
        extensionCache[name] = ext;
        return ext;
    }
}



/**
 * Compile shader.
 */
export const compileShader = (gl: WebGLRenderingContext, typeBit: number, shaderSource: string): WebGLShader => {
    const shader = gl.createShader(typeBit);
    if (!shader) {
        throw new Error('No shader was created');
    }
    gl.shaderSource(shader, shaderSource);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        gl.deleteShader(shader);
        throw new Error(`An error occurred compiling the shader: ${gl.getShaderInfoLog(shader)}.    \n\n Shader code: ${shaderSource}`);
    }
    return shader;
};


/**
 * Note that every program *must* have one and only one vertex-shader
 * and one and only one fragment shader.
 * That means you cannot add multiple fragment-shaders in one program. Instead, either load them in consecutively as part of different programs,
 * or generate an über-shader that contains both codes.
 */
export const createShaderProgram = (gl: WebGLRenderingContext, vertexShaderSource: string, fragmentShaderSource: string): WebGLProgram => {

    const program = gl.createProgram();
    if (!program) {
        throw new Error('No program was created');
    }

    const vertexShader = compileShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
    const fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);

    gl.linkProgram(program);

    gl.detachShader(program, vertexShader);
    gl.detachShader(program, fragmentShader);
    gl.deleteShader(vertexShader);
    gl.deleteShader(fragmentShader);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        gl.deleteProgram(program);
        throw new Error('Unable to initialize the shader program: ' + gl.getProgramInfoLog(program));
    }

    return program;
};


/**
 * Important: the blend-equation has an effect on data-textures.
 * If you have a pixel with values [125, 42, 255, 0], this pixel might get blended in the background,
 * causing you to lose that data in the rgb channels of the pixel.
 *
 * Auszug aus Chat mit Kollegen:
 * [16:21, 4.11.2020] Michael: Ich hab das Problem gefunden
 * [16:22, 4.11.2020] Michael: Sagen wir ich habe ein Objekt mit id 781
 * [16:22, 4.11.2020] Michael: In base 256 ist das
 * [16:22, 4.11.2020] Michael: (16, 3, 0, 0)
 * [16:23, 4.11.2020] Michael: Diese Daten habe ich als Pixelwert in meiner Textur gespeichert, als rgba
 * [16:23, 4.11.2020] Michael: Mit anderen Worten: a = 0
 * [16:24, 4.11.2020] Michael: Außerdem aber war die gl_blendEquation(gl_FuncAdd) gesetzt
 * [16:24, 4.11.2020] Michael: Das bedeutet, Pixel mit Transparenz werden mit dem Hintergrund verblendet
 * [16:24, 4.11.2020] Michael: Dadurch wurden meine Daten mit dem Hintergrund verwaschen, und dadurch haben sich meine ids geändert
 * [16:25, 4.11.2020] Michael: Das Problem war stärker bei niedrigen ids, weil da die opazität besonders gering war
 * [16:25, 4.11.2020] Michael: Hah!
 */
export const setup3dScene = (gl: WebGLRenderingContext): void => {
    // gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

    // allowing depth-testing
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    gl.cullFace(gl.BACK);

    // allowing for transparent objects
    gl.enable(gl.BLEND);
    gl.blendEquation( gl.FUNC_ADD );
    gl.blendFunc( gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA );

    clearBackground(gl, [0, 0, 0, 1]);
};

export const updateViewPort = (gl: WebGLRenderingContext, x0: number, y0: number, x1: number, y1: number): void => {
    gl.viewport(x0, y0, x1, y1);
};


export const bindProgram = (gl: WebGLRenderingContext, program: WebGLProgram): void => {
    gl.useProgram(program);
};


export const clearBackground = (gl: WebGLRenderingContext, color: number[]): void => {
    gl.clearColor(color[0], color[1], color[2], color[3]);
    gl.clearDepth(1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
};


 /**
  * A generic buffer, together with it's metadata.
  *
  * Really, a buffer is only a array, with no information about count, length, stride, offset etc.
  * It is up to the vertex-array to interpret the buffer as having any of these properties.
  * However, in reality we rarely have a case where two vertex-array entries interpret the same buffer in different ways.
  * So we store the dimensions of a buffer together with the buffer here, so that it can be
  * consistently interpreted everywhere.
  */
export interface BufferObject {
    buffer: WebGLBuffer;
    dataPointType: number;
    staticOrDynamicDraw: number;
    attributeType: WebGLAttributeType;
}


/**
 * Create buffer. Creation is slow! Do *before* render loop.
 */
export const createBuffer = (gl: WebGLRenderingContext, datatype: WebGLAttributeType, data: Float32Array, changesOften = false): BufferObject => {

    const buffer = gl.createBuffer();
    if (!buffer) {
        throw new Error('No buffer was created');
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, data, changesOften ? gl.DYNAMIC_DRAW : gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);  // unbinding

    const bufferObject: BufferObject = {
        buffer: buffer,
        dataPointType: gl.FLOAT,   // the data is 32bit floats
        staticOrDynamicDraw: changesOften ? gl.DYNAMIC_DRAW : gl.STATIC_DRAW,
        attributeType: datatype
    };


    return bufferObject;
};



export interface VertexArrayObject {
    buffers: BufferObject[];
    vao: WebGLVertexArrayObject;
}

export const createVertexArray = (gl: WebGLRenderingContext): VertexArrayObject => {
    const ext = getExtension(gl, 'OES_vertex_array_object');
    const o = ext.createVertexArrayOES();
    return {
        buffers: [],
        vao: o
    };
};


export const drawArray = (gl: WebGLRenderingContext, drawingMode: GlDrawingMode, vectorCount: number, offset = 0): void => {
    let glDrawingMode: number;
    switch (drawingMode) {
        case 'lines':
            glDrawingMode = gl.LINES;
            break;
        case 'points':
            glDrawingMode = gl.POINTS;
            break;
        case 'triangles':
            glDrawingMode = gl.TRIANGLES;
            break;
    }
    gl.drawArrays(glDrawingMode, offset, vectorCount);
};

export const drawArrayInstanced = (gl: WebGLRenderingContext, drawingMode: GlDrawingMode, vectorCount: number, offset = 0, nrLoops: number): void => {
    let glDrawingMode: number;
    switch (drawingMode) {
        case 'lines':
            glDrawingMode = gl.LINES;
            break;
        case 'points':
            glDrawingMode = gl.POINTS;
            break;
        case 'triangles':
            glDrawingMode = gl.TRIANGLES;
            break;
    }
    const ext = getExtension(gl, 'ANGLE_instanced_arrays');
    ext.drawArraysInstancedANGLE(glDrawingMode, offset, vectorCount, nrLoops);
};


export const updateBufferData = (gl: WebGLRenderingContext, bo: BufferObject, newData: Float32Array): BufferObject => {

    gl.bindBuffer(gl.ARRAY_BUFFER, bo.buffer);
    gl.bufferData(gl.ARRAY_BUFFER, newData, bo.staticOrDynamicDraw);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);  // unbinding

    const newBufferObject: BufferObject = {
        buffer: bo.buffer,
        dataPointType: gl.FLOAT,   // the data is 32bit floats
        staticOrDynamicDraw: bo.staticOrDynamicDraw,
        attributeType: bo.attributeType
    };

    return newBufferObject;
};




/**
 * Fetch attribute's location (attribute declared in some shader). Slow! Do *before* render loop.
 */
export const getAttributeLocation = (gl: WebGLRenderingContext, program: WebGLProgram, attributeName: string): number => {
    const loc = gl.getAttribLocation(program, attributeName);
    if (loc === -1) {
        throw new Error(`Couldn't find attribute ${attributeName} in program.`);
    }
    return loc;
};



/**
 * Returns size of type in bytes.
 * type: gl.FLOAT | gl.BYTE | gl.SHORT | gl.UNSIGNED_BYTE | gl.UNSIGNED_SHORT
 */
const sizeOf = (gl: WebGLRenderingContext, type: number): number => {
    switch (type) {
        case gl.FLOAT:
            return 4;
        case gl.BYTE:
        case gl.SHORT:
        case gl.UNSIGNED_BYTE:
        case gl.UNSIGNED_SHORT:
        default:
            throw new Error(`Unknown type ${type}`);
    }
};


/**
 * If nrInstances !== 0: binding with vertexAttribDivisor(loc, nrInstances)
 */
export const bindBufferToAttribute = (gl: WebGLRenderingContext, attributeLocation: number, bo: BufferObject, nrInstances = 0): void => {
    const ext = getExtension(gl, 'ANGLE_instanced_arrays');
    // Bind buffer to global-state ARRAY_BUFFER
    gl.bindBuffer(gl.ARRAY_BUFFER, bo.buffer);
    // Enable editing of vertex-array-location
    gl.enableVertexAttribArray(attributeLocation);

    // Bind the buffer currently at global-state ARRAY_BUFFER to a vertex-array-location.
    const byteSize = sizeOf(gl, bo.dataPointType);
    switch (bo.attributeType) {
        /**
         * https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/vertexAttribPointer
         * index: A GLuint specifying the index of the vertex attribute that is to be modified.
         * size: A GLint specifying the number of components per vertex attribute. Must be 1, 2, 3, or 4.
         * type: A GLenum specifying the data type of each component in the array.
         * normalized: A GLboolean specifying whether integer data values should be normalized into a certain range when being cast to a float.
         * stride: A GLsizei specifying the offset in bytes between the beginning of consecutive vertex attributes. Cannot be larger than 255. If stride is 0, the attribute is assumed to be tightly packed, that is, the attributes are not interleaved but each attribute is in a separate block, and the next vertex' attribute follows immediately after the current vertex.
         * offset: A GLintptr specifying an offset in bytes of the first component in the vertex attribute array. Must be a multiple of the byte length of type.
         */
        //                             index,              size, type,             norml, stride,        offset
        case 'float':
            gl.enableVertexAttribArray(attributeLocation);
            gl.vertexAttribPointer(    attributeLocation,     1, bo.dataPointType, false, 1 * byteSize,  0               );
            if (nrInstances) ext.vertexAttribDivisorANGLE(attributeLocation, nrInstances);
            break;
        case 'vec2':
            gl.enableVertexAttribArray(attributeLocation);
            gl.vertexAttribPointer(    attributeLocation,     2, bo.dataPointType, false, 2 * byteSize,  0               );
            if (nrInstances) ext.vertexAttribDivisorANGLE(attributeLocation, nrInstances);
            break;
        case 'vec3':
            gl.enableVertexAttribArray(attributeLocation);
            gl.vertexAttribPointer(    attributeLocation,     3, bo.dataPointType, false, 3 * byteSize,  0               );
            if (nrInstances) ext.vertexAttribDivisorANGLE(attributeLocation, nrInstances);
            break;
        case 'vec4':
            gl.enableVertexAttribArray(attributeLocation);
            gl.vertexAttribPointer(    attributeLocation,     4, bo.dataPointType, false, 4 * byteSize,  0               );
            if (nrInstances) ext.vertexAttribDivisorANGLE(attributeLocation, nrInstances);
            break;
        case 'mat2':
            gl.enableVertexAttribArray(attributeLocation + 0);
            gl.vertexAttribPointer(    attributeLocation + 0, 2, bo.dataPointType, false, 4 * byteSize,  0 * 2 * byteSize);
            if (nrInstances) ext.vertexAttribDivisorANGLE(attributeLocation, nrInstances);
            gl.enableVertexAttribArray(attributeLocation + 1);
            gl.vertexAttribPointer(    attributeLocation + 1, 2, bo.dataPointType, false, 4 * byteSize,  1 * 2 * byteSize);
            if (nrInstances) ext.vertexAttribDivisorANGLE(attributeLocation + 1, nrInstances);
            break;
        case 'mat3':
            gl.enableVertexAttribArray(attributeLocation + 0);
            gl.vertexAttribPointer(    attributeLocation + 0, 3, bo.dataPointType, false, 9 * byteSize,  0 * 3 * byteSize);
            if (nrInstances) ext.vertexAttribDivisorANGLE(attributeLocation, nrInstances);
            gl.enableVertexAttribArray(attributeLocation + 1);
            gl.vertexAttribPointer(    attributeLocation + 1, 3, bo.dataPointType, false, 9 * byteSize,  1 * 3 * byteSize);
            if (nrInstances) ext.vertexAttribDivisorANGLE(attributeLocation + 1, nrInstances);
            gl.enableVertexAttribArray(attributeLocation + 2);
            gl.vertexAttribPointer(    attributeLocation + 2, 3, bo.dataPointType, false, 9 * byteSize,  2 * 3 * byteSize);
            if (nrInstances) ext.vertexAttribDivisorANGLE(attributeLocation + 2, nrInstances);
            break;
        case 'mat4':
            gl.enableVertexAttribArray(attributeLocation + 0);
            gl.vertexAttribPointer(    attributeLocation + 0, 4, bo.dataPointType, false, 16 * byteSize, 0 * 4 * byteSize); // col 0
            if (nrInstances) ext.vertexAttribDivisorANGLE(attributeLocation, nrInstances);
            gl.enableVertexAttribArray(attributeLocation + 1);
            gl.vertexAttribPointer(    attributeLocation + 1, 4, bo.dataPointType, false, 16 * byteSize, 1 * 4 * byteSize); // col 1
            if (nrInstances) ext.vertexAttribDivisorANGLE(attributeLocation + 1, nrInstances);
            gl.enableVertexAttribArray(attributeLocation + 2);
            gl.vertexAttribPointer(    attributeLocation + 2, 4, bo.dataPointType, false, 16 * byteSize, 2 * 4 * byteSize); // col 2
            if (nrInstances) ext.vertexAttribDivisorANGLE(attributeLocation + 2, nrInstances);
            gl.enableVertexAttribArray(attributeLocation + 3);
            gl.vertexAttribPointer(    attributeLocation + 3, 4, bo.dataPointType, false, 16 * byteSize, 3 * 4 * byteSize); // col 3
            if (nrInstances) ext.vertexAttribDivisorANGLE(attributeLocation + 3, nrInstances);
            break;
    }
};


export const bindBufferToAttributeVertexArray = (gl: WebGLRenderingContext, attributeLocation: number, bufferObject: BufferObject, va: VertexArrayObject): VertexArrayObject => {
    const ext = getExtension(gl, 'OES_vertex_array_object');
    ext.bindVertexArrayOES(va.vao);
    bindBufferToAttribute(gl, attributeLocation, bufferObject);
    va.buffers.push(bufferObject);
    return va;
};


/**
 * Number of instances that will be rotated through before moving along one step of this buffer.
 * I.e. each entry in this buffer remains the same for `nrInstances` instances,
 * that is, for `nrInstances * data.length` vertices.
 */
export const bindBufferToAttributeInstanced = (gl: WebGLRenderingContext, attributeLocation: number, bufferObject: BufferObject, nrInstances: number): void => {
    bindBufferToAttribute(gl, attributeLocation, bufferObject, nrInstances);
};


export const bindBufferToAttributeInstancedVertexArray = (gl: WebGLRenderingContext, attributeLocation: number, bufferObject: BufferObject, nrInstances: number, va: VertexArrayObject): VertexArrayObject => {
    const ext = getExtension(gl, 'OES_vertex_array_object');
    ext.bindVertexArrayOES(va.vao);
    bindBufferToAttributeInstanced(gl, attributeLocation, bufferObject, nrInstances);
    va.buffers.push(bufferObject);
    return va;
};

export const bindVertexArray = (gl: WebGLRenderingContext, va: VertexArrayObject): void => {
    const ext = getExtension(gl, 'OES_vertex_array_object');
    ext.bindVertexArrayOES(va.vao);
};


export interface IndexBufferObject {
    buffer: WebGLBuffer;
    count: number;
    type: number; // must be gl.UNSIGNED_SHORT
    offset: number;
    staticOrDynamicDraw: number; // gl.DYNAMIC_DRAW or gl.STATIC_DRAW
}

export const createIndexBuffer = (gl: WebGLRenderingContext, indices: Uint16Array, changesOften = false): IndexBufferObject => {

    const buffer = gl.createBuffer();
    if (!buffer) {
        throw new Error('No buffer was created');
    }
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, changesOften ? gl.DYNAMIC_DRAW : gl.STATIC_DRAW);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);

    // Back in WebGl 1, index-buffers were restricted to UShort (max allowed value inside `indicesFlattened`: 65535).
    // That was for also supporting very low-end devices.
    // In WebGL2 we now also have UInt indices (max allowed value inside `indicesFlattened`: 4294967296).
    const bufferObject: IndexBufferObject = {
        buffer: buffer,
        count: indices.length,
        type: gl.UNSIGNED_SHORT,
        offset: 0,
        staticOrDynamicDraw: changesOften ? gl.DYNAMIC_DRAW : gl.STATIC_DRAW
    };

    return bufferObject;
};

export const bindIndexBuffer = (gl: WebGLRenderingContext, ibo: IndexBufferObject) => {
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo.buffer);
};

export const drawElements = (gl: WebGLRenderingContext, ibo: IndexBufferObject, drawingMode: GlDrawingMode): void => {
    let glDrawingMode: number;
    switch (drawingMode) {
        case 'lines':
            glDrawingMode = gl.LINES;
            break;
        case 'points':
            glDrawingMode = gl.POINTS;
            break;
        case 'triangles':
            glDrawingMode = gl.TRIANGLES;
            break;
    }
    gl.drawElements(glDrawingMode, ibo.count, ibo.type, ibo.offset);
};

export const drawElementsInstanced = (gl: WebGLRenderingContext, ibo: IndexBufferObject, drawingMode: GlDrawingMode, nrLoops: number): void => {
    let glDrawingMode: number;
    switch (drawingMode) {
        case 'lines':
            glDrawingMode = gl.LINES;
            break;
        case 'points':
            glDrawingMode = gl.POINTS;
            break;
        case 'triangles':
            glDrawingMode = gl.TRIANGLES;
            break;
    }
    const ext = getExtension(gl, 'ANGLE_instanced_arrays');
    ext.drawElementsInstancedANGLE(glDrawingMode, ibo.count, ibo.type, ibo.offset, nrLoops);
};




export interface TextureObject {
    textureType: TextureType;
    texture: WebGLTexture;
    width: number;
    height: number;
    level: number;
    internalformat: number;
    format: number;
    type: number;
    border: number;
}

export type TextureType = 'ubyte4' | 'float4';


/**
 * Note that float-textures are not renderable. They may be inputs, but they cannot be outputs.
 * (At least, not without extensions).
 * Table from here: https://stackoverflow.com/questions/45571488/webgl-2-readpixels-on-framebuffers-with-float-textures
 *
 *
 * | Internal Format    | Format          | Type                           | Source Bytes Per Pixel | Can be rendered to | Requires gl.NEAREST |
 * |--------------------|-----------------|--------------------------------|------------------------|--------------------|---------------------|
 * | RGBA               | RGBA            | UNSIGNED_BYTE                  | 4                      | t                  | f                   |
 * | RGB	            | RGB             | UNSIGNED_BYTE                  | 3                      | t                  | f                   |
 * | RGBA               | RGBA            | UNSIGNED_SHORT_4_4_4_4         | 2                      | t                  | f                   |
 * | RGBA               | RGBA            | UNSIGNED_SHORT_5_5_5_1	       | 2                      | t                  | f                   |
 * | RGB                | RGB             | UNSIGNED_SHORT_5_6_5           | 2                      | t                  | f                   |
 * | LUMINANCE_ALPHA    | LUMINANCE_ALPHA | UNSIGNED_BYTE	               | 2                      | t                  | f                   |
 * | LUMINANCE          | LUMINANCE       | UNSIGNED_BYTE                  | 1                      | t                  | f                   |
 * | ALPHA              | ALPHA           | UNSIGNED_BYTE                  | 1                      | t                  | f                   |
 **/

export const getTextureParas = (gl: WebGLRenderingContext, t: TextureType, data: number[]) => {
    switch (t) {
        case 'ubyte4':
            return {
                internalFormat: gl.RGBA,
                format: gl.RGBA,
                type: gl.UNSIGNED_BYTE,
                binData: new Uint8Array(data),
            };
        case 'float4':
            // https://stackoverflow.com/questions/26554157/webgl-rendering-to-floating-point-texture
            return {
                internalFormat: gl.RGBA,
                format: gl.RGBA,
                type: gl.FLOAT,
                binData: new Float32Array(data),
            };
    }
};

export const inferTextureType = (gl: WebGLRenderingContext, to: TextureObject): TextureType => {
    if (to.internalformat === gl.RGBA && to.type === gl.UNSIGNED_BYTE) {
        return 'ubyte4';
    } else {
        throw new Error(`Unknown texture-object-paras: internalformat ${to.internalformat}, type: ${to.type}`);
    }
};

/**
 * A shader's attributes get their buffer-values from the VERTEX_ARRAY, but they are constructed in the ARRAY_BUFFER.
 * Textures analogously are served from the TEXTURE_UNITS, while for construction they are bound to ACTIVE_TEXTURE.
 *
 * There is a big difference, however. Contrary to buffers which receive their initial value while still outside the ARRAY_BUFFER,
 * a texture does already have to be bound into the TEXTURE_UNITS when it's being created.
 * Since it'll always be bound into the slot that ACTIVE_TEXTURE points to, you can inadvertently overwrite another texture that is
 * currently in this place. To avoid this, we provide a dedicated `textureConstructionBindPoint`.
 *
 * Buffers are easier in this, since with vertexAttribPointer we are guaranteed to get a slot in the VERTEX_ARRAY that is not
 * already occupied by another buffer.
 */
export const createTexture = (gl: WebGLRenderingContext, image: HTMLImageElement | HTMLCanvasElement): TextureObject => {

    const texture = gl.createTexture();  // analog to createBuffer
    if (!texture) {
        throw new Error('No texture was created');
    }
    gl.activeTexture(gl.TEXTURE0 + textureConstructionBindPoint); // so that we don't overwrite another texture in the next line.
    gl.bindTexture(gl.TEXTURE_2D, texture);  // analog to bindBuffer. Binds texture to currently active texture-bindpoint (aka. texture unit).

    const level = 0;
    const internalFormat = gl.RGBA;
    const format = gl.RGBA;
    const type = gl.UNSIGNED_BYTE;

    gl.texImage2D(gl.TEXTURE_2D, level, internalFormat, format, type, image);  // analog to bufferData
    if (isPowerOf(image.width, 2) && isPowerOf(image.height, 2))
        gl.generateMipmap(gl.TEXTURE_2D); // mipmaps are mini-versions of the texture.
    else console.warn(`Not a power-of-two image - won't generate mip-maps: `, image);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); // when accessing texture2D(u_tex, vec2(1.2, 0.3)), this becomes  texture2D(u_tex, vec2(1.0, 0.3))
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE); // when accessing texture2D(u_tex, vec2(0.2, 1.3)), this becomes  texture2D(u_tex, vec2(0.2, 1.0))
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);  // Must be NEAREST or LINEAR to accomodate NPOT textures: https://stackoverflow.com/questions/3792027/webgl-and-the-power-of-two-image-size
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.bindTexture(gl.TEXTURE_2D, null);  // unbinding

    let w, h: number;
    if (image instanceof HTMLImageElement) {
        w = image.naturalWidth;
        h = image.naturalHeight;
    } else {
        w = image.width;
        h = image.height;
    }

    const textureObj: TextureObject = {
        textureType: 'ubyte4',
        texture: texture,
        level: level,
        internalformat: internalFormat,
        format: format,
        type: type,
        width: w,
        height: h,
        border: 0
    };

    return textureObj;
};




/**
 * This is just another texture, but optimized for carrying data, not for display.
 *
 */
export const createDataTexture = (gl: WebGLRenderingContext, data: number[][][], t: TextureType = 'ubyte4'): TextureObject => {
    const height = data.length;
    const width = data[0].length;
    const channels = data[0][0].length;
    if (!isPowerOf(height, 2) || !isPowerOf(width, 2)) {
        throw new Error('Expecting texture to have a power-two width and height');
    }
    // if ( channels !== 4) {
    //     // @todo: remove this when we implement non-rgba data-textures.
    //     throw new Error(`Expecting 4 channels, but ${channels} provided`);
    // }

    const texture = gl.createTexture();  // analog to createBuffer
    if (!texture) {
        throw new Error('No texture was created');
    }
    gl.activeTexture(gl.TEXTURE0 + textureConstructionBindPoint); // so that we don't overwrite another texture in the next line.
    gl.bindTexture(gl.TEXTURE_2D, texture);  // analog to bindBuffer. Binds texture to currently active texture-bindpoint (aka. texture unit).

    // to be used for data. we want no interpolation of data, so disallow mipmap and interpolation.
    const level = 0;
    const border = 0;
    const paras = getTextureParas(gl, t, flatten3(data));
    if (t === 'float4') {
        const ext = getExtension(gl, 'OES_texture_float');
        const ext2 = getExtension(gl, 'WEBGL_color_buffer_float');
    }

    if (channels !== 4) {
        // have WebGL digest data one byte at a time.
        // (Per default tries 4 bytes at a time, which causes errors when our data is not a multiple of 4).
        const alignment = 1; // valid values are 1, 2, 4, and 8.
        gl.pixelStorei(gl.UNPACK_ALIGNMENT, alignment);
    }

    gl.texImage2D(gl.TEXTURE_2D, level, paras.internalFormat, width, height, border, paras.format, paras.type, paras.binData); // analog to bufferData
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.bindTexture(gl.TEXTURE_2D, null);  // unbinding


    const textureObj: TextureObject = {
        textureType: t,
        texture: texture,
        level: level,
        internalformat: paras.internalFormat,
        format: paras.format,
        type: paras.type,
        width: width,
        height: height,
        border: border
    };

    return textureObj;
};

/**
 * @TODO: unify this method with createTexture and createDataTexture
 */
export const createEmptyTexture = (gl: WebGLRenderingContext, width: number, height: number, type: TextureType = 'ubyte4', use: 'data' | 'display' = 'data'): TextureObject => {
    if (width <= 0 || height <= 0) {
        throw new Error('Width and height must be positive.');
    }
    const texture = gl.createTexture();
    if (!texture) {
        throw new Error('No texture was created');
    }

    const paras = getTextureParas(gl, type, []);
    if (type === 'float4') {
        const ext = getExtension(gl, 'OES_texture_float');
        const ext2 = getExtension(gl, 'WEBGL_color_buffer_float');
    }

    gl.activeTexture(gl.TEXTURE0 + textureConstructionBindPoint); // so that we don't overwrite another texture in the next line.
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, paras.internalFormat, width, height, 0, paras.format, paras.type, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    if (use === 'data') {
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    } else {
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR );
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR );
    }
    gl.bindTexture(gl.TEXTURE_2D, null);

    const textureObj: TextureObject = {
        textureType: type,
        texture: texture,
        level: 0,
        internalformat: paras.internalFormat,
        format: paras.format,
        type: paras.type,
        width: width,
        height: height,
        border: 0
    };

    return textureObj;
};


/**
 * Even though we reference textures as uniforms in a fragment shader, assigning an actual texture-value to that uniform works differently from normal uniforms.
 * Normal uniforms have a concrete value.
 * Texture uniforms, on the other hand, are just an integer-index that points to a special slot in the GPU memory (the bindPoint) where the actual texture value lies.
 */
export const bindTextureToUniform = (gl: WebGLRenderingContext, texture: WebGLTexture, bindPoint: number, uniformLocation: WebGLUniformLocation): void =>  {
    if (bindPoint > gl.getParameter(gl.MAX_COMBINED_TEXTURE_IMAGE_UNITS)) {
        throw new Error(`There are only ${gl.getParameter(gl.MAX_COMBINED_TEXTURE_IMAGE_UNITS)} texture bind points, but you tried to bind to point nr. ${bindPoint}.`);
    }
    if (bindPoint === textureConstructionBindPoint) {
        console.error(`You are about to bind to the dedicated texture-construction bind point (nr. ${bindPoint}).
        If after this call another texture is built, your shader will now use that new texture instead of this one!
        Consider using another bind point.`);
    }
    gl.activeTexture(gl.TEXTURE0 + bindPoint);  // pick active texture-slot. analog to enableVertexAttribArray
    gl.bindTexture(gl.TEXTURE_2D, texture);  // analog to bindBuffer. Binds texture to currently active texture-bindpoint (aka. texture unit).
    gl.uniform1i(uniformLocation, bindPoint); // tell program where to find texture-uniform. analog to vertexAttribPointer
};



export const updateTexture = (gl: WebGLRenderingContext, to: TextureObject, newData: HTMLImageElement | HTMLCanvasElement | number[][][]): TextureObject => {

    gl.activeTexture(gl.TEXTURE0 + textureConstructionBindPoint); // so that we don't overwrite another texture in the next line.
    gl.bindTexture(gl.TEXTURE_2D, to.texture);  // analog to bindBuffer. Binds texture to currently active texture-bindpoint (aka. texture unit).
    if (newData instanceof HTMLImageElement || newData instanceof HTMLCanvasElement) {
        gl.texImage2D(gl.TEXTURE_2D, 0, to.internalformat, to.format, to.type, newData);  // analog to bufferData
        gl.generateMipmap(gl.TEXTURE_2D); // mipmaps are mini-versions of the texture. Doesn't seem to work if data comes as number[][][].
    } else {
        const width = newData[0].length;
        const height = newData.length;
        if ( !isPowerOf(width, 2) || !isPowerOf(height, 2) ) {
            throw new Error(`Texture-data-dimensions must be a power of two, but are ${height} x ${width}`);
        }

        const paras = getTextureParas(gl, to.textureType, flatten3(newData));
        gl.texImage2D(gl.TEXTURE_2D, to.level, to.internalformat, to.width, to.height, to.border, to.format, to.type, paras.binData);
    }
    gl.bindTexture(gl.TEXTURE_2D, null);  // unbinding

    if (newData instanceof HTMLImageElement) {
        to.width = newData.naturalWidth;
        to.height = newData.naturalHeight;
    } else if (newData instanceof HTMLCanvasElement) {
        to.width = newData.width;
        to.height = newData.height;
    } else {
        to.width = newData[0].length;
        to.height = newData.length;
    }

    return to;
};


export interface FramebufferObject {
    framebuffer: WebGLFramebuffer;
    texture: TextureObject;
    width: number;
    height: number;
}


export const createFramebuffer = (gl: WebGLRenderingContext): WebGLFramebuffer => {
    const fb = gl.createFramebuffer();  // analog to createBuffer
    if (!fb) {
        throw new Error(`Error creating framebuffer`);
    }
    return fb;
};

export const createEmptyFramebufferObject = (gl: WebGLRenderingContext, width: number, height: number, type: TextureType, use: 'data' | 'display'): FramebufferObject => {
    const fb = createFramebuffer(gl);
    const fbTexture = createEmptyTexture(gl, width, height, type, use);
    const fbo = bindTextureToFramebuffer(gl, fbTexture, fb);
    return fbo;
};


/**
 * The operations `clear`, `drawArrays` and `drawElements` only affect the currently bound framebuffer.
 *
 * Note that binding the framebuffer does *not* mean binding its texture.
 * In fact, if there is a bound texture, it must be the *input* to a shader, not the output.
 * Therefore, a framebuffer's texture must not be bound when the framebuffer is.
 */
export const bindFramebuffer = (gl: WebGLRenderingContext, fbo: FramebufferObject, manualViewport?: [number, number, number, number]) => {
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo.framebuffer);
    // It's EXTREMELY IMPORTANT to remember to call gl.viewport and set it to the size of the thing your rendering to.
    // https://webglfundamentals.org/webgl/lessons/webgl-render-to-texture.html
    if (manualViewport) {
        if ((fbo.width / fbo.height) !== (manualViewport[2] / manualViewport[3])) {
            console.warn(`Your viewport-aspect is different from the framebuffer-aspect.`);
        }
        gl.viewport(...manualViewport);
    } else {
        gl.viewport(0, 0, fbo.width, fbo.height);
    }
};

/**
 * Webgl renders to the viewport, which is relative to canvas.width * canvas.height.
 * (To be more precise, only *polygons* are clipped to the viewport.
 * Operations like `clearColor()` et.al., will still draw to the *full* canvas.width * height!
 * If you want to also constrain clearColor, use `scissor` instead of viewport.)
 * That canvas.width * canvas.height then gets stretched to canvas.clientWidth * canvas.clientHeight.
 * (Note: the full canvas.width gets stretched to clientWidth, not just the viewport!)
 */
export const bindCanvasToDrawingBuffer = (gl: WebGLRenderingContext, manualViewport?: [number, number, number, number]) => {
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    // It's EXTREMELY IMPORTANT to remember to call gl.viewport and set it to the size of the thing your rendering to.
    // https://webglfundamentals.org/webgl/lessons/webgl-render-to-texture.html
    if (manualViewport) {
        if ((gl.canvas.width / gl.canvas.height) !== (manualViewport[2] / manualViewport[3])) {
            console.warn(`Your viewport-aspect is different from the canvas-aspect.`);
        }
        gl.viewport(...manualViewport);
    } else {
        // Note: don't use clientWidth here.
        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    }
};


/**
 * A framebuffer can have a texture - that is the bitmap that the shader-*out*put is drawn on.
 * Shaders may also have one or more *in*put texture(s), which must be provided to the shader as a uniform sampler2D.
 * Only the shader needs to know about any potential input texture, the framebuffer will always only know about it's output texture.
 */
export const bindTextureToFramebuffer = (gl: WebGLRenderingContext, texture: TextureObject, fb: WebGLFramebuffer): FramebufferObject => {
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture.texture, 0); // analog to bufferData

    if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) {
        throw new Error(`Error creating framebuffer: framebuffer-status: ${gl.checkFramebufferStatus(gl.FRAMEBUFFER)} ; error-code: ${gl.getError()}`);
    }

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    const fbo: FramebufferObject = {
        framebuffer: fb,
        texture: texture,
        width: texture.width,
        height: texture.height
    };

    return fbo;
};










/**
 * Fetch uniform's location (uniform declared in some shader). Slow! Do *before* render loop.
 */
export const getUniformLocation = (gl: WebGLRenderingContext, program: WebGLProgram, uniformName: string): WebGLUniformLocation => {
    const loc = gl.getUniformLocation(program, uniformName);
    if (loc === null) {
        throw new Error(`Couldn't find uniform ${uniformName} in program.`);
    }
    return loc;
};






/**
 * Contrary to attributes, uniforms don't need to be stored in a buffer. (Note: in WebGL 2.0, however, there *are* uniform buffers!)
 *
 * 'v' is not about the shader, but how you provide data from the js-side.
 * uniform1fv(loc, [3.19]) === uniform1f(loc, 3.19)
 *
 * |js                                      |          shader                  |
 * |----------------------------------------|----------------------------------|
 * |uniform1f(loc, 3.19)                    |  uniform float u_pi;             |
 * |uniform2f(loc, 3.19, 2.72)              |  uniform vec2 u_constants;       |
 * |uniform2fv(loc, [3.19, 2.72])           |  uniform vec2 u_constants;       |
 * |uniform1fv(loc, [1, 2, 3, 4, 5, 6])     |  uniform float u_kernel[6];      |
 * |uniform2fv(loc, [1, 2, 3, 4, 5, 6])     |  uniform vec2 u_observations[3]; |
 * |uniformMatrix3fv(loc, [[...], [...]])   |  uniform mat3 u_matrix;          |
 *
 * A note about `structs`. A shader code like this:
 * ```glsl
 * struct LightInfo {
 *    vec4 Position;
 *    vec3 La;
 * };
 * uniform LightInfo Light;
 * ```
 * ... is accessed like that:
 * ```js
 * const lightPosLoc = gl.getUniformLocation(program, "Light.Position");
 * const lightLaLoc = gl.getUniformLocation(program, "Light.La");
 * gl.uniform4fv(lightPosLoc, [1, 2, 3, 4]);
 * gl.uniform3fv(lightLaLoc, [1, 2, 3]);
 * ```
 *
 */
export const bindValueToUniform = (gl: WebGLRenderingContext, uniformLocation: WebGLUniformLocation, type: WebGLUniformType, values: number[]): void => {
    switch (type) {
        case 'bool':
            gl.uniform1i(uniformLocation, values[0]);
            break;
        case 'bvec2':
            gl.uniform2i(uniformLocation, values[0], values[1]);
            break;
        case 'bvec3':
            gl.uniform3i(uniformLocation, values[0], values[1], values[2]);
            break;
        case 'bvec4':
            gl.uniform4i(uniformLocation, values[0], values[1], values[2], values[3]);
            break;
        case 'bool[]':
            gl.uniform1iv(uniformLocation, values);
            break;
        case 'bvec2[]':
            gl.uniform2iv(uniformLocation, values);
            break;
        case 'bvec3[]':
            gl.uniform3iv(uniformLocation, values);
            break;
        case 'bvec4[]':
            gl.uniform4iv(uniformLocation, values);
            break;

        case 'int':
            gl.uniform1i(uniformLocation, values[0]);
            break;
        case 'ivec2':
            gl.uniform2i(uniformLocation, values[0], values[1]);
            break;
        case 'ivec3':
            gl.uniform3i(uniformLocation, values[0], values[1], values[2]);
            break;
        case 'ivec4':
            gl.uniform4i(uniformLocation, values[0], values[1], values[2], values[3]);
            break;
        case 'int[]':
            gl.uniform1iv(uniformLocation, values);
            break;
        case 'ivec2[]':
            gl.uniform2iv(uniformLocation, values);
            break;
        case 'ivec3[]':
            gl.uniform3iv(uniformLocation, values);
            break;
        case 'ivec4[]':
            gl.uniform4iv(uniformLocation, values);
            break;

        case 'float':
            gl.uniform1f(uniformLocation, values[0]);
            break;
        case 'vec2':
            gl.uniform2f(uniformLocation, values[0], values[1]);
            break;
        case 'vec3':
            gl.uniform3f(uniformLocation, values[0], values[1], values[2]);
            break;
        case 'vec4':
            gl.uniform4f(uniformLocation, values[0], values[1], values[2], values[3]);
            break;
        case 'float[]':
            gl.uniform1fv(uniformLocation, values);
            break;
        case 'vec2[]':
            gl.uniform2fv(uniformLocation, values);
            break;
        case 'vec3[]':
            gl.uniform3fv(uniformLocation, values);
            break;
        case 'vec4[]':
            gl.uniform4fv(uniformLocation, values);
            break;

        // In the following *matrix* calls, the 'transpose' parameter must always be false.
        // Quoting the OpenGL ES 2.0 spec:
        // If the transpose parameter to any of the UniformMatrix* commands is
        // not FALSE, an INVALID_VALUE error is generated, and no uniform values are
        // changed.
        case 'mat2':
            gl.uniformMatrix2fv(uniformLocation, false, values);
            break;

        case 'mat3':
            gl.uniformMatrix3fv(uniformLocation, false, values);
            break;

        case 'mat4':
            gl.uniformMatrix4fv(uniformLocation, false, values);
            break;

        default:
            throw Error(`Type ${type} not implemented.`);
    }
};


/**
 * (From https://hacks.mozilla.org/2013/04/the-concepts-of-webgl/ and https://stackoverflow.com/questions/56303648/webgl-rendering-buffers:)
 * Ignoring handmade framebuffers, WebGl has two framebuffers that are always in use: the `frontbuffer/displaybuffer` and the `backbuffer/drawingbuffer`.
 * WebGl per default renders to the `drawingbuffer`, aka. the `backbuffer`.
 * There is also the currently displayed buffer, named the `frontbuffer` aka. the `displaybuffer`.
 * the WebGL programmer has no explicit access to the frontbuffer whatsoever.
 *
 * Once you called `clear`, `drawElements` or `drawArrays`, the browser marks the canvas as `needs to be composited`.
 * Assuming `preserveDrawingBuffer == false` (the default): Immediately before compositing, the browser
 *  - swaps the back- and frontbuffer
 *  - clears the new backbuffer.
 * If `preserveDrawingBuffer === true`: Immediately before compositing, the browser
 *  - copies the drawingbuffer to the frontbuffer.
 *
 * As a consequence, if you're going to use canvas.toDataURL or canvas.toBlob or gl.readPixels or any other way of getting data from a WebGL canvas,
 * unless you read it in the same event it will likely have been cleared when you try to read it.
 *
 * In the past, old games always preserved the drawing buffer, so they'd only have to change those pixels that have actually changed. Nowadays preserveDrawingBuffer is false by default.
 *
 * A (almost brutal) workaround to get the canvas to preserve the drawingBuffer can be found here: https://stackoverflow.com/questions/26783586/canvas-todataurl-returns-blank-image
 *
 *
 *
 * glReadPixels returns pixel data from the frame buffer, starting with the pixel whose lower left corner is at location (x, y),
 * into client memory starting at location data. The GL_PACK_ALIGNMENT parameter, set with the glPixelStorei command,
 * affects the processing of the pixel data before it is placed into client memory.
 * glReadPixels returns values from each pixel with lower left corner at x + i y + j for 0 <= i < width and 0 <= j < height .
 * This pixel is said to be the ith pixel in the jth row. Pixels are returned in row order from the lowest to the highest row,
 * left to right in each row.
 * Return values are placed in memory as follows. If format is GL_ALPHA, a single value is returned and the data for the ith pixel
 * in the jth row is placed in location j ⁢ width + i . GL_RGB returns three values and GL_RGBA returns four values for each pixel,
 * with all values corresponding to a single pixel occupying contiguous space in data. Storage parameter GL_PACK_ALIGNMENT,
 * set by glPixelStorei, affects the way that data is written into memory. See glPixelStorei for a description.
 *
 * Note: WebGL2 allows to use `drawBuffer` and `readBuffer`, so that we are no longer limited to only the current framebuffer.
 */
export const getCurrentFramebuffersPixels = (gl: WebGLRenderingContext, width: number, height: number): ArrayBuffer  => {

    const canRead: boolean = (gl.checkFramebufferStatus(gl.FRAMEBUFFER) == gl.FRAMEBUFFER_COMPLETE);
    if (!canRead) {
        throw new Error('Cannot read from current framebuffer. FramebufferStatus = ' + gl.checkFramebufferStatus(gl.FRAMEBUFFER));
    }


    const format = gl.getParameter(gl.IMPLEMENTATION_COLOR_READ_FORMAT);
    const type = gl.getParameter(gl.IMPLEMENTATION_COLOR_READ_TYPE);

    let pixels;
    if (type === gl.UNSIGNED_BYTE) {
        pixels = new Uint8Array(gl.drawingBufferWidth * gl.drawingBufferHeight * 4);
    } else if (type === gl.UNSIGNED_SHORT_5_6_5 || type === gl.UNSIGNED_SHORT_4_4_4_4 || type === gl.UNSIGNED_SHORT_5_5_5_1) {
        pixels = new Uint16Array(gl.drawingBufferWidth * gl.drawingBufferHeight * 4);
    } else if (type === gl.FLOAT) {
        pixels = new Float32Array(gl.drawingBufferWidth * gl.drawingBufferHeight * 4);
    } else {
        throw new Error(`Did not understand pixel data type ${type} for format ${format}`);
    }

    // Just like `toDataURL` or `toBlob`, `readPixels` does not access the frontbuffer.
    // It accesses the backbuffer or any other currently active framebuffer.
    gl.readPixels(0, 0, width, height, format, type, pixels);

    return pixels;
};

export const getDebugInfo = (gl: WebGLRenderingContext): object => {
    const baseInfo = {
        renderer: gl.getParameter(gl.RENDERER),
        currentProgram: gl.getParameter(gl.CURRENT_PROGRAM),
        arrayBuffer: gl.getParameter(gl.ARRAY_BUFFER_BINDING),
        elementArrayBuffer: gl.getParameter(gl.ELEMENT_ARRAY_BUFFER_BINDING),
        frameBuffer: gl.getParameter(gl.FRAMEBUFFER_BINDING),
        renderBuffer: gl.getParameter(gl.RENDERBUFFER_BINDING),
        texture: gl.getParameter(gl.TEXTURE_BINDING_2D),
        viewPort: gl.getParameter(gl.VIEWPORT)
    };
    const programInfo = {
        infoLog: gl.getProgramInfoLog(baseInfo.currentProgram)
    };
    return {
        baseInfo, programInfo
    };
};
