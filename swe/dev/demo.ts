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



const camera = new PerspectiveCamera(70, threejs_canvas.clientWidth / threejs_canvas.clientHeight, 0.01, 100);
camera.position.set(2, 10, 2);
camera.lookAt(0, 5, -5);

const scene = new Scene();

const light = new DirectionalLight(0xffffff, 1.0);
light.position.set(0, 20, 30);
light.lookAt(0, 0, 0);
scene.add(light);

const renderer = new WebGLRenderer({ antialias: true, canvas: threejs_canvas });
renderer.setSize(threejs_canvas.clientWidth, threejs_canvas.clientHeight);

const controls = new OrbitControls(camera, threejs_canvas);

const geometry = new PlaneGeometry(10, 10, huvImage.width - 1, huvImage.height - 1);
const material = new MeshPhongMaterial({ color: 'rgb(20, 125, 125)' });
const plane = new Mesh(geometry, material);
plane.position.set(0, 0.1, 0);
plane.lookAt(0, 1, 0);
scene.add(plane);

const ah = new AxesHelper(2.5);
scene.add(ah);


let t = 0;
renderer.setAnimationLoop((time) => {
  sweRenderer.render(true);

  if (t % 10 === 0) {
    const sweData = sweRenderer.getImageData() as any;
    const oldPositions = plane.geometry.getAttribute('position');
    for (let i = 0; i < oldPositions.count; i++) {  
      const h = sweData[i * 4];
      oldPositions.setZ(i, h / 25);
    }
    oldPositions.needsUpdate = true;
    plane.geometry.computeVertexNormals();
  }

  controls.update();
  renderer.render(scene, camera);

  t += 1;
});

