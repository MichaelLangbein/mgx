import { AxesHelper, DataTexture, FloatType, Mesh, MeshStandardMaterial, NearestFilter, PerspectiveCamera, PlaneBufferGeometry, PointLight, RepeatWrapping, RGBAFormat, Scene, Texture, TextureLoader, WebGLRenderer } from "three";
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { GPUComputationRenderer } from 'three/examples/jsm/misc/GPUComputationRenderer';


//-------------------------- Section 1: dom-elements --------------------------------------------
const container = document.getElementById('container') as HTMLCanvasElement;


//----------------------- Section 2: threejs scaffold -------------------------------------------
const renderer = new WebGLRenderer({ antialias: true, canvas: container, alpha: true });
renderer.setSize(container.clientWidth, container.clientHeight);

const camera = new PerspectiveCamera(50, container.width / container.height, 0.001, 100);
camera.position.fromArray([8, 8, 8]);
camera.lookAt(0, 0, 0);

const controls = new OrbitControls(camera, container);

const loader = new TextureLoader();

const scene = new Scene();


//---------------------- Section 3: scene-objects ------------------------------------------------
const light = new PointLight('#ffffff', 1);
light.position.fromArray([0, 10, 0]);
light.lookAt(0, 0, 0);
scene.add(light);


// const w = 100;
// const h = 100;
// const gpuCompute = new GPUComputationRenderer(w, h, renderer);
// const state0Data = new Float32Array( w * h * 4 );
// for (let r = 0; r < h; r++) {
//   for (let c = 0; c < w; c++) {
//     state0Data[(r * h + c) * 4 + 0] = Math.random() > 0.5 ? 1.0 : 0.0;  // red
//     state0Data[(r * h + c) * 4 + 3] = 1.0;                              // alpha
//   }
// }
// const huv0 = new DataTexture(state0Data, w, h, RGBAFormat, FloatType);
// const differentialShader = gpuCompute.createShaderMaterial(differentialShaderCode, { huvData: null, kData: null, dk: null });
// const summarizeShader = gpuCompute.createShaderMaterial(summarizeShaderCode, { huvData: null, k1: null, k2: null, k3: null, k4: null });
// const k1Target = gpuCompute.createRenderTarget(w, h, RepeatWrapping, RepeatWrapping, NearestFilter, NearestFilter);
// const k2Target = gpuCompute.createRenderTarget(w, h, RepeatWrapping, RepeatWrapping, NearestFilter, NearestFilter);
// const k3Target = gpuCompute.createRenderTarget(w, h, RepeatWrapping, RepeatWrapping, NearestFilter, NearestFilter);
// const k4Target = gpuCompute.createRenderTarget(w, h, RepeatWrapping, RepeatWrapping, NearestFilter, NearestFilter);
// const outputTarget = gpuCompute.createRenderTarget(w, h, RepeatWrapping, RepeatWrapping, NearestFilter, NearestFilter);


// differentialShader.uniforms.huvData.value = huv0; // = outputTarget.texture;
// // differentialShader.uniforms.kData.value = null;
// differentialShader.uniforms.dk.value = 0.0;
// gpuCompute.doRenderTarget(differentialShader, k1Target);
// differentialShader.uniforms.kData.value = k1Target.texture;
// differentialShader.uniforms.dk.value = 0.5;
// gpuCompute.doRenderTarget(differentialShader, k2Target);
// differentialShader.uniforms.kData.value = k2Target.texture;
// differentialShader.uniforms.dk.value = 0.5;
// gpuCompute.doRenderTarget(differentialShader, k3Target);
// differentialShader.uniforms.kData.value = k3Target.texture;
// differentialShader.uniforms.dk.value = 1.0;
// gpuCompute.doRenderTarget(differentialShader, k4Target);
// summarizeShader.uniforms.huvData.value = huv0;
// summarizeShader.uniforms.k1.value = k1Target.texture;
// summarizeShader.uniforms.k2.value = k2Target.texture;
// summarizeShader.uniforms.k3.value = k3Target.texture;
// summarizeShader.uniforms.k4.value = k4Target.texture;
// gpuCompute.doRenderTarget(summarizeShader, outputTarget);
// // now use outputTarget.texture


const shader1Code = `
  void main() {
    gl_FragColor = vec4(1.0, 1.0, 1.0, 1.0);
  }
`;
const w = 30;
const h = 30;
const gpuCompute = new GPUComputationRenderer(w, h, renderer);
const shader1 = gpuCompute.createShaderMaterial(shader1Code, {});
const shader1Target = gpuCompute.createRenderTarget(w, h, RepeatWrapping, RepeatWrapping, NearestFilter, NearestFilter);
gpuCompute.doRenderTarget(shader1, shader1Target);

const plane = new Mesh(
  new PlaneBufferGeometry(5, 5, 2, 2),
  new MeshStandardMaterial({
    color: 'rgb(117, 255, 250)',
    refractionRatio: 0.985,
    map: shader1Target.texture
  })
);
plane.position.set(0, 0, 0);
plane.lookAt(0, 1, 0);
scene.add(plane);

const ah = new AxesHelper(5);
scene.add(ah);


//--------------------- Section 4: animation-loop -------------------------------------------------
renderer.setAnimationLoop((time, frame) => {
  gpuCompute.doRenderTarget(shader1, shader1Target);
  controls.update();
  renderer.render(scene, camera);
});
