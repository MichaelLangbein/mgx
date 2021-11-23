import { RungeKuttaRenderer } from '../src';


/**
 * This demo also showcases webgl's float-texture behavior.
 * Input may be any float-value, 
 * but when rendering to the canvas, webgl clamps all to [0, 1]
 */



const canvas = document.getElementById('canvas') as HTMLCanvasElement;


const renderer = new RungeKuttaRenderer(canvas);

function render() {
    console.log('drawing ...')
    renderer.render(true);
    setTimeout(render, 100);
}

render();