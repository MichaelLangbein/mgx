import { SweRenderer } from '../src/swe';
import { 
  PerspectiveCamera, Scene, SphereGeometry, MeshNormalMaterial,
  Mesh, WebGLRenderer, AmbientLight, PlaneGeometry
} from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';


const canvas = document.getElementById('canvas') as HTMLCanvasElement;
const huvImage = document.getElementById('huvImage') as HTMLImageElement;
const HImage = document.getElementById('HImage') as HTMLImageElement;
const threejs_canvas = document.getElementById('threejs_canvas') as HTMLCanvasElement;




const sweRenderer = new SweRenderer(canvas, huvImage, HImage);
sweRenderer.init();



const camera = new PerspectiveCamera(70, threejs_canvas.clientWidth / threejs_canvas.clientHeight, 0.01, 100);
camera.position.x = 10;
camera.position.y = 10;
camera.position.z = 10;

const scene = new Scene();

const light = new AmbientLight();
scene.add(light);

const renderer = new WebGLRenderer({ antialias: true, canvas: threejs_canvas });
renderer.setSize(threejs_canvas.clientWidth, threejs_canvas.clientHeight);

const controls = new OrbitControls(camera, threejs_canvas);

const geometry = new PlaneGeometry(10, 10, huvImage.width, huvImage.height);
const material = new MeshNormalMaterial();
const plane = new Mesh(geometry, material);
scene.add(plane);

renderer.setAnimationLoop((time) => {
  sweRenderer.render();
  const sweData = sweRenderer.getImageData() as Uint8Array;

  const oldPositions = plane.geometry.getAttribute('position');
  for (let i = 0; i < sweData.length - 4; i += 4) {
    const h = sweData.at(i);
    // oldPositions.setZ(i % 4, h / 25.5);
    // @ts-ignore
    oldPositions.array[i % 4] = h / 25.5;
  }
  oldPositions.needsUpdate = true;
  plane.geometry.computeBoundingBox();
  plane.geometry.computeBoundingSphere();
  controls.update();
  renderer.render(scene, camera);
});

