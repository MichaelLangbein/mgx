import { SweRenderer } from '../src/swe';


const canvas = document.getElementById('canvas') as HTMLCanvasElement;
const huvImage = document.getElementById('huvImage') as HTMLImageElement;
const HImage = document.getElementById('HImage') as HTMLImageElement;

const renderer = new SweRenderer(canvas, huvImage, HImage);
renderer.init();


function renderLoop() {
  console.log('drawing ...')
  renderer.render();

  setTimeout(() => {
    renderLoop();
  }, 100);
}

renderLoop();
