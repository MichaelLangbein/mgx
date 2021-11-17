import { SweRenderer } from '../src/swe';
import { 
  PerspectiveCamera, Scene, SphereGeometry, MeshNormalMaterial,
  Mesh, WebGLRenderer, AmbientLight, PlaneGeometry, AxesHelper,
  DirectionalLight, MeshPhongMaterial, MeshLambertMaterial
} from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';


const canvas = document.getElementById('canvas') as HTMLCanvasElement;
const huvImage = document.getElementById('huvImage') as HTMLImageElement;
const HImage = document.getElementById('HImage') as HTMLImageElement;
const threejs_canvas = document.getElementById('threejs_canvas') as HTMLCanvasElement;




const sweRenderer = new SweRenderer(canvas, huvImage, HImage);
sweRenderer.init();



const camera = new PerspectiveCamera(70, threejs_canvas.clientWidth / threejs_canvas.clientHeight, 0.01, 100);
camera.position.set(2, 6, 10);
camera.lookAt(0, 0, 0);

const scene = new Scene();

const light = new DirectionalLight(0xffffff, 1.0);
light.position.set(0, 20, 30);
light.lookAt(0, 0, 0);
scene.add(light);

const renderer = new WebGLRenderer({ antialias: true, canvas: threejs_canvas });
renderer.setSize(threejs_canvas.clientWidth, threejs_canvas.clientHeight);

const controls = new OrbitControls(camera, threejs_canvas);

const geometry = new PlaneGeometry(10, 10, huvImage.width, huvImage.height);
const material = new MeshPhongMaterial({ color: 'rgb(20, 125, 125)' });
const plane = new Mesh(geometry, material);
plane.position.x = 0;
plane.position.y = 0.1;
plane.position.z = 0;
plane.lookAt(0, 1, 0);
scene.add(plane);

const ah = new AxesHelper(2.5);
scene.add(ah);


let t = 0;
renderer.setAnimationLoop((time) => {
  sweRenderer.render();

  t += 1;
  if (t % 4 === 0) {
    const sweData = sweRenderer.getImageData() as Uint8Array;
    const oldPositions = plane.geometry.getAttribute('position');
    for (let i = 0; i < sweData.length - 4; i += 4) {
      const h = sweData[i];
      const j = i / 4;
      const x = oldPositions.getX(j);
      const y = oldPositions.getY(j);
      oldPositions.setXYZ(j, x, y, h / 100);
    }
    oldPositions.needsUpdate = true;
    plane.geometry.computeVertexNormals();
  }
  controls.update();
  renderer.render(scene, camera);
});


// compare with this: https://hofk.de/main/discourse.threejs/2020/ColorWave/ColorWave.html
