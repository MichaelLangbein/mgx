import { 
  AxesHelper, Mesh, MeshStandardMaterial, PerspectiveCamera, 
  PlaneBufferGeometry, PointLight, Scene, WebGLRenderer 
} from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { RungeKuttaRenderer } from "../src";


/**
 * @TODOs
 *  - create custom-material that uses fluid-texture for normal-calculation
 */


//-------------------------- Section 1: dom-elements --------------------------------------------
const container = document.getElementById('container') as HTMLCanvasElement;


//----------------------- Section 2: threejs scaffold -------------------------------------------
const renderer = new WebGLRenderer({ antialias: true, canvas: container, alpha: true });
renderer.setSize(container.clientWidth, container.clientHeight);

const camera = new PerspectiveCamera(50, container.width / container.height, 0.001, 100);
camera.position.fromArray([8, 8, 8]);
camera.lookAt(0, 0, 0);

const controls = new OrbitControls(camera, container);

const scene = new Scene();


//---------------------- Section 3: scene-objects ------------------------------------------------
const light = new PointLight('#ffffff', 1);
light.position.fromArray([0, 10, 0]);
light.lookAt(0, 0, 0);
scene.add(light);


const w = 256;
const h = 256;
const huv0Data = new Float32Array( w * h * 4 );
const huv1Data = new Float32Array( w * h * 4 );
for (let r = 0; r < h; r++) {
  for (let c = 0; c < w; c++) {
    if (Math.abs(r - h/2) < 3 && Math.abs(c - h/2) < 3) {
      huv1Data[(r * h + c) * 4 + 0] = 10.0;  // red
    }
    huv1Data[(r * h + c) * 4 + 3] = 1.0;  // alpha
  }
}
const fluidShader = `
  float h   = data[0];
  float u   = data[1];
  float v   = data[2];
  float hpx = data_px[0];
  float upx = data_px[1];
  float vpx = data_px[2];
  float hmx = data_mx[0];
  float umx = data_mx[1];
  float vmx = data_mx[2];
  float hpy = data_py[0];
  float upy = data_py[1];
  float vpy = data_py[2];
  float hmy = data_my[0];
  float umy = data_my[1];
  float vmy = data_my[2];

  float H  = 15.0;
  float dx = 0.05;
  float dy = 0.05;
  float f = 0.001;
  float b = 0.003;
  float g = 9.831;

  float dudx = (upx - umx) / (2.0 * dx);
  float dvdy = (vpy - vmy) / (2.0 * dy);
  float dhdx = (hpx - hmx) / (2.0 * dx);
  float dhdy = (hpy - hmy) / (2.0 * dy);

  float dhdt =      - H * ( dudx + dvdy );
  float dudt = ( + f*v - b*u - g * dhdx );
  float dvdt = ( - f*u - b*v - g * dhdy );

  gl_FragColor = vec4(dhdt, dudt, dvdt, 1.0);
`;
const fluidSim = new RungeKuttaRenderer(renderer, w, h, huv1Data, fluidShader);
container.addEventListener('click', (evt) => {
  plane.material.map = fluidSim.updateInputTexture(huv1Data);
  plane.material.needsUpdate = true;
})


const plane = new Mesh(
  new PlaneBufferGeometry(5, 5, 100, 100),
  new MeshStandardMaterial({
    color: 'rgb(117, 255, 250)',
    refractionRatio: 0.985,
    // displacementMap: fluidSim.getOutputTexture()
    map: fluidSim.getOutputTexture()
  })
);
plane.position.set(0, 0, 0);
plane.lookAt(0, 1, 0);
scene.add(plane);

const ah = new AxesHelper(5);
scene.add(ah);


//--------------------- Section 4: animation-loop -------------------------------------------------
renderer.setAnimationLoop((time, frame) => {
  fluidSim.update();
  controls.update();
  renderer.render(scene, camera);
});
