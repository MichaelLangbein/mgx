import { RungeKuttaRenderer } from '../src';


/**
 * This demo also showcases webgl's float-texture behavior.
 * Input may be any float-value, 
 * but when rendering to the canvas, webgl clamps all to [0, 1]
 */



const canvas = document.getElementById('canvas') as HTMLCanvasElement;

const data = [];
for (let r = 0; r < 256; r++) {
    data.push([]);
    for (let c = 0; c < 256; c++) {
        if (Math.abs(r - 256/2) < 10 && Math.abs(c - 256/2) < 10) {
            data[r].push([0.0, 10.0, 10.0, 1.0]);
        } else {
            data[r].push([0.0, 0.0, 0.0, 1.0]);
        }
    }
}

const code = /*glsl*/`
            float u = data[1];
            float v = data[2];
            float upx = data_px[1];
            float vpx = data_px[2];
            float umx = data_mx[1];
            float vmx = data_mx[2];
            float upy = data_py[1];
            float vpy = data_py[2];
            float umy = data_my[1];
            float vmy = data_my[2];
            float dx = 0.05;
            float dy = 0.05;

            float dudt = - u * (upx - umx) / (2.0 * dx) - v * (vpy - vmy) / (2.0 * dy);
            float dvdt = - u * (upx - umx) / (2.0 * dx) - v * (vpy - vmy) / (2.0 * dy);

            gl_FragColor = vec4(0.0, dudt, dvdt, 1.0);
`;

const renderer = new RungeKuttaRenderer(canvas, data, code);

function render() {
    console.log('drawing ...')
    renderer.render(true);
    setTimeout(render, 100);
}

render();