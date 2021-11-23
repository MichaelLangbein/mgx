import { TextureSwappingRenderer } from '../../engine2/src/engine.more';
import { Program, TextureData } from '../src';


/**
 * This demo also showcases webgl2's float-texture behavior.
 * Input may be any float-value, 
 * but when rendering to the canvas, webgl2 clamps all to [0, 1]
 */



const canvas = document.getElementById('canvas') as HTMLCanvasElement;


const data = [];
for (let r = 0; r < 256; r++) {
    data.push([]);
    for (let c = 0; c < 256; c++) {
        data[r].push([Math.sin(r / 10), Math.cos(c / 10), 0, 1]);
    }
}

const program = new Program(/*glsl*/`#version 300 es
    precision mediump float;
    in vec4 a_vertex;
    in vec2 a_textureCoord;
    out vec2 v_textureCoord;
    
    void main() {
        v_textureCoord = a_textureCoord;
        gl_Position = a_vertex;  
    }
    `, /*glsl*/`#version 300 es
    precision mediump float;
    uniform sampler2D u_texture;
    uniform vec2 u_textureSize;
    in vec2 v_textureCoord;
    out vec4 fragColor;

    void main() {

        vec2 deltaX = vec2(1.0 / u_textureSize.x, 0.0);
        vec2 deltaY = vec2(0.0, 1.0 / u_textureSize.y);
        vec4 texData00 = texture(u_texture, v_textureCoord );
        vec4 texDataPX = texture(u_texture, v_textureCoord + deltaX);
        vec4 texDataMX = texture(u_texture, v_textureCoord - deltaX);
        vec4 texDataPY = texture(u_texture, v_textureCoord + deltaY);
        vec4 texDataMY = texture(u_texture, v_textureCoord - deltaY);

        fragColor = (texData00 + texDataPX + texDataMX + texDataPX + texDataMY) / 5.0;
        // fragColor = fragColor * 0.0 + texData00;
    }
`);

const renderer = new TextureSwappingRenderer(
    canvas, 
    program,
    {},
    {},
    {
        'u_texture': new TextureData(data, 'float4')
    },
    'u_texture'
);
renderer.init();

function render() {
    renderer.render();
    setTimeout(render, 100);
}

render();