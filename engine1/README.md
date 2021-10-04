<h1><img src="https://raw.githubusercontent.com/MichaelLangbein/mgx/main/logo.svg" width="30">@mgx/engine1</h1>

Very basic WebGL engine. Does as good as no abstraction - only intended to make the whole WebGL API a little less verbose.


## Installation

```
npm i @mgx/engine1
```


## Example usage


This demo draws a few moving cubes and adds some blur on top of them.

<img src="https://raw.githubusercontent.com/MichaelLangbein/mgx/main/media/engine1_demo.gif" width="150" />

```ts
import { bindTextureToFramebuffer, createEmptyTexture, createFramebuffer, FramebufferObject } from '../src/webgl';
import { Context, InstancedElementsBundle, Index, Program, AttributeData,
    ElementsBundle, InstancedAttributeData, UniformData, ArrayBundle, TextureData } from '../src/engine.core';
import { boxE, gaussianKernel, rectangleA } from '../../utils/shapes';
import { projectionMatrix, identityMatrix, matrixMultiplyList, rotateXMatrix,
    rotateYMatrix, rotateZMatrix, translateMatrix, transposeMatrix, flatten2, flatten3 } from '../../utils/math';
import { renderLoop } from '../../utils/general';



const body = document.getElementById('container') as HTMLDivElement;
const canvas = document.getElementById('canvas') as HTMLCanvasElement;
canvas.width = canvas.clientWidth;
canvas.height = canvas.clientHeight;
const gl = canvas.getContext('webgl') as WebGLRenderingContext;
if (!gl) {
    throw new Error('no context');
}

const box = boxE(0.25, 0.25, 0.25);



const nrInstances = 4;

let transformMatrices = [
    transposeMatrix(translateMatrix(-0.5,  0.5, -3.5)),
    transposeMatrix(translateMatrix( 0.5,  0.5, -2.5)),
    transposeMatrix(translateMatrix( 0.5, -0.5, -1.5)),
    transposeMatrix(translateMatrix(-0.5, -0.5, -0.5)),
];

let colors = [
    [1.0, 0.0, 0.0, 1.0],
    [0.0, 1.0, 0.0, 1.0],
    [0.0, 0.0, 1.0, 1.0],
    [1.0, 1.0, 0.0, 1.0],
];

const projection = transposeMatrix(projectionMatrix(Math.PI / 2, 1, 0.01, 100));

const context = new Context(gl, true);

const drawingBundle = new InstancedElementsBundle(new Program(`
    precision mediump float;
    attribute vec4 a_position;
    attribute mat4 a_transform;
    attribute vec4 a_color;
    varying vec4 v_color;
    uniform mat4 u_projection;
    void main() {
        vec4 pos = u_projection * a_transform * a_position;
        gl_Position = pos;
        v_color = a_color;
    }
`, `
    precision mediump float;
    varying vec4 v_color;
    void main() {
        gl_FragColor = v_color;
    }
`), {
    'a_position': new AttributeData(new Float32Array(flatten2(box.vertices)), 'vec4', false),
    'a_transform': new InstancedAttributeData(new Float32Array(flatten3(transformMatrices)), 'mat4', true, 1),
    'a_color': new InstancedAttributeData(new Float32Array(flatten2(colors)), 'vec4', false, 1)
}, {
    'u_projection': new UniformData('mat4', flatten2(projection))
}, {},
'triangles',
new Index(new Uint16Array(flatten2(box.vertexIndices))), nrInstances);


const fb = createFramebuffer(gl);
const fbTexture = createEmptyTexture(gl, canvas.width, canvas.height);
const fbo = bindTextureToFramebuffer(gl, fbTexture, fb);




const blurBundle = new ArrayBundle(new Program(`
    precision mediump float;
    attribute vec4 a_position;
    attribute vec2 a_texPosition;
    varying vec2 v_texPosition;
    void main() {
        gl_Position = a_position;
        v_texPosition = a_texPosition;
    }
`, `
    precision mediump float;
    uniform sampler2D u_texture;
    uniform vec2 u_textureSize;
    uniform mat3 u_blur;
    varying vec2 v_texPosition;
    void main() {
        float deltaX = 7.0 / u_textureSize[0];
        float deltaY = 7.0 / u_textureSize[1];
        vec4 color = texture2D(u_texture, v_texPosition + vec2(-deltaX,  deltaY)) * u_blur[0][0]
                   + texture2D(u_texture, v_texPosition + vec2(      0,  deltaY)) * u_blur[1][0]
                   + texture2D(u_texture, v_texPosition + vec2( deltaX,  deltaY)) * u_blur[2][0]
                   + texture2D(u_texture, v_texPosition + vec2(-deltaX,       0)) * u_blur[0][1]
                   + texture2D(u_texture, v_texPosition + vec2(      0,       0)) * u_blur[1][1]
                   + texture2D(u_texture, v_texPosition + vec2( deltaX,       0)) * u_blur[2][1]
                   + texture2D(u_texture, v_texPosition + vec2(-deltaX, -deltaY)) * u_blur[0][2]
                   + texture2D(u_texture, v_texPosition + vec2(      0, -deltaY)) * u_blur[1][2]
                   + texture2D(u_texture, v_texPosition + vec2( deltaX, -deltaY)) * u_blur[2][2];
        gl_FragColor = color;
    }
`), {
    'a_position': new AttributeData(new Float32Array(flatten2(rectangleA(2, 2).vertices)), 'vec4', false),
    'a_texPosition': new AttributeData(new Float32Array(flatten2(rectangleA(2, 2).texturePositions)), 'vec2', false),
}, {
    'u_blur': new UniformData('mat3', flatten2(transposeMatrix(gaussianKernel()))),
    'u_textureSize': new UniformData('vec2', [fbo.width, fbo.height])
}, {
    'u_texture': new TextureData(fbo.texture)
}, 'triangles', 6);






drawingBundle.upload(context);
drawingBundle.initVertexArray(context);
blurBundle.upload(context);
blurBundle.initVertexArray(context);

let time = 0;
renderLoop(60, (tDelta: number) => {
    time += tDelta;

    drawingBundle.bind(context);
    transformMatrices = [
        transposeMatrix(matrixMultiplyList([  translateMatrix(-1.0,  0.8, 0.5 * Math.sin(time * 0.003) + -3.5), rotateXMatrix(time * 0.1), ])),
        transposeMatrix(matrixMultiplyList([  translateMatrix( 0.5,  0.5, 1.0 * Math.sin(time * 0.005) + -2.5), rotateYMatrix(time * 0.1), ])),
        transposeMatrix(matrixMultiplyList([  translateMatrix( 0.5, -0.5, 0.5 * Math.sin(time * 0.003) + -1.5), rotateZMatrix(time * 0.1), ])),
        transposeMatrix(matrixMultiplyList([  translateMatrix(-0.2, -0.2, 1.0 * Math.sin(time * 0.003) + -1.5), rotateXMatrix(time * 0.1), ])),
    ];
    drawingBundle.updateAttributeData(context, 'a_transform', new Float32Array(flatten3(transformMatrices)));
    drawingBundle.draw(context, [0, 0, 0, 0], fbo);

    blurBundle.bind(context);
    blurBundle.draw(context);
});

```


## Important classes 

 - `Program`: Container for a WebGLProgram - contains the vertex- and the fragment-shader-code.
 - `Bundle`: Container for a Program together with all related attribute-, uniform-, and texture-data. Handles uploading of all data to the GPU, the binding of that data to the right slots, and the actual rendering.
   - `ArrayBundle`: Use this type of bundle for `gl.drawArrays`-style drawing. Simple, but requires you to keep multiple copies of a vertex if the vertex forms part of more than one triangle.
   - `ElementsBundle`: Use this type of bundle for `gl.drawElements`-style drawing. Instead of duplicating vertices that are used in multiple objects (like `ArrayBundle` does), it relies on an `Index` to tell the GPU which vertex to pick next. This way, the GPU doesn't loop a single time through the array of given vertices, but jumps around according to the index. A bit more memory-efficient.
   - `InstancedArrayBundle`: Like `ArrayBundle`, but for `drawArraysInstancedANGLE`-style drawing. Loops through the given vertices `nrInstances` times. Efficient when you want to draw many instances of the same object, such as hundreds of trees, only with variations in location. Expects every *instanced* attribute to contain `nrInstances` times as many values. That is, when using an instanced `attribute mat4` and `nrInstances=3`, requires you to pass in the data for 3 `mat4`-matrices (so, 3 * 16 = 48 values). Use ordinary `AttributeData` for data that doesn't change between instances, and `InstancedAttributeData` for data that *does*.
   - `InstancedElementsBundle`: Like `ElementsBundle`, but for `drawElementsInstancedANGLE`-style drawing. Loops through the given vertices `nrInstances` times. Efficient when you want to draw many instances of the same object, such as hundreds of trees, only with variations in location. Expects every *instanced* attribute to contain `nrInstances` times as many values. That is, when using an instanced `attribute mat4` and `nrInstances=3`, requires you to pass in the data for 3 `mat4`-matrices (so, 3 * 16 = 48 values). Use ordinary `AttributeData` for data that doesn't change between instances, and `InstancedAttributeData` for data that *does*.
 - `IAttributeData`
   - `AttributeData`: Container for attribute-data. A copy of the data is kept locally even after uploading the data to the GPU, so that it can later be re-uploaded, if required.
   - `InstancedAttributeData`: Like `AttributeData`, but expects there to be `nrInstances` times as many values. That is, for a `vec2` with `nrInstances=4`, you'd pass 4 * 2 = 8 values. Can only be used in an `InstancedArrayBundle` or an `InstancedElementsBundle`.
 - `UniformData`: Container for uniform-data. A copy of the data is kept locally even after uploading the data to the GPU, so that it can later be re-uploaded, if required. 
 - `TextureData`: Container for texture-data. A copy of the data is kept locally even after uploading the data to the GPU, so that it can later be re-uploaded, if required.
 - `FramebufferObject`: Every bundle can optionally render to a framebuffer instead of to the canvas. This way, the data now inside the framebuffer can be used as the input for another shader.