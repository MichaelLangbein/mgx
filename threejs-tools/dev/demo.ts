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

const w = 256;
const h = 256;
const huv0Data = new Float32Array( w * h * 4 );
for (let r = 0; r < h; r++) {
  for (let c = 0; c < w; c++) {
    if (Math.abs(r - h/2) < 3 && Math.abs(c - h/2) < 3) {
      huv0Data[(r * h + c) * 4 + 0] = 1.0;  // red
    }
    huv0Data[(r * h + c) * 4 + 3] = 1.0;  // alpha
  }
}
const huv0 = new DataTexture(huv0Data, w, h, RGBAFormat, FloatType);

const differentialShaderCode = `
  uniform sampler2D huvTexture;
  uniform sampler2D kTexture;
  uniform float dk;

  void main() {
    vec2 position = gl_FragCoord.xy / resolution.xy;
    vec2 deltaX = vec2(1.0 / resolution.x, 0.0);
    vec2 deltaY = vec2(0.0, 1.0 / resolution.y);

    float dt = 0.005;

    vec4 data    = texture2D(huvTexture, position          ) + dt * dk * texture2D(kTexture, position          );
    vec4 data_px = texture2D(huvTexture, position + deltaX ) + dt * dk * texture2D(kTexture, position + deltaX );
    vec4 data_mx = texture2D(huvTexture, position - deltaX ) + dt * dk * texture2D(kTexture, position - deltaX );
    vec4 data_py = texture2D(huvTexture, position + deltaY ) + dt * dk * texture2D(kTexture, position + deltaY );
    vec4 data_my = texture2D(huvTexture, position - deltaY ) + dt * dk * texture2D(kTexture, position - deltaY );

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
  }
`;

const summarizeShaderCode = `
  uniform sampler2D huvTexture;
  uniform sampler2D k1Texture;
  uniform sampler2D k2Texture;
  uniform sampler2D k3Texture;
  uniform sampler2D k4Texture;

  void main() {
    vec2 position = gl_FragCoord.xy / resolution.xy;

    float dt = 0.005;

    vec4 data = texture2D(huvTexture, position);
    vec4 k1   = texture2D(k1Texture,  position);
    vec4 k2   = texture2D(k2Texture,  position);
    vec4 k3   = texture2D(k3Texture,  position);
    vec4 k4   = texture2D(k4Texture,  position);

    vec4 weightedAverage = data + dt * (k1 + 2.0 * k2 + 2.0 * k3 + k4) / 6.0;

    gl_FragColor = vec4(weightedAverage.xyz, 1.0);
  }
`;

const gpuCompute = new GPUComputationRenderer(w, h, renderer);


const differentialShader = gpuCompute.createShaderMaterial(differentialShaderCode, { huvTexture: {value: null }, kTexture: {value: null }, dk: {value: null } });
const summarizeShader = gpuCompute.createShaderMaterial(summarizeShaderCode, { huvTexture: {value: null }, k1Texture: {value: null }, k2Texture: {value: null }, k3Texture: {value: null }, k4Texture: {value: null } });
const k1Target = gpuCompute.createRenderTarget(w, h, RepeatWrapping, RepeatWrapping, NearestFilter, NearestFilter);
const k2Target = gpuCompute.createRenderTarget(w, h, RepeatWrapping, RepeatWrapping, NearestFilter, NearestFilter);
const k3Target = gpuCompute.createRenderTarget(w, h, RepeatWrapping, RepeatWrapping, NearestFilter, NearestFilter);
const k4Target = gpuCompute.createRenderTarget(w, h, RepeatWrapping, RepeatWrapping, NearestFilter, NearestFilter);
const summaryTarget = gpuCompute.createRenderTarget(w, h, RepeatWrapping, RepeatWrapping, NearestFilter, NearestFilter);

differentialShader.uniforms.huvTexture.value = huv0;
differentialShader.uniforms.dk.value = 0.0;
gpuCompute.doRenderTarget(differentialShader, k1Target);
differentialShader.uniforms.dk.value = 0.5;
differentialShader.uniforms.kTexture.value = k1Target.texture;
gpuCompute.doRenderTarget(differentialShader, k2Target);
differentialShader.uniforms.dk.value = 0.5;
differentialShader.uniforms.kTexture.value = k2Target.texture;
gpuCompute.doRenderTarget(differentialShader, k3Target);
differentialShader.uniforms.dk.value = 1.0;
differentialShader.uniforms.kTexture.value = k3Target.texture;
gpuCompute.doRenderTarget(differentialShader, k4Target);
summarizeShader.uniforms.huvTexture.value = huv0;
summarizeShader.uniforms.k1Texture.value = k1Target.texture;
summarizeShader.uniforms.k2Texture.value = k2Target.texture;
summarizeShader.uniforms.k3Texture.value = k3Target.texture;
summarizeShader.uniforms.k4Texture.value = k4Target.texture;
gpuCompute.doRenderTarget(summarizeShader, summaryTarget);


const plane = new Mesh(
  new PlaneBufferGeometry(5, 5, 2, 2),
  new MeshStandardMaterial({
    color: 'rgb(117, 255, 250)',
    refractionRatio: 0.985,
    map: summaryTarget.texture
  })
);
plane.position.set(0, 0, 0);
plane.lookAt(0, 1, 0);
scene.add(plane);

const ah = new AxesHelper(5);
scene.add(ah);


//--------------------- Section 4: animation-loop -------------------------------------------------
renderer.setAnimationLoop((time, frame) => {
  differentialShader.uniforms.huvTexture.value = summaryTarget.texture;
  differentialShader.uniforms.dk.value = 0.0;
  gpuCompute.doRenderTarget(differentialShader, k1Target);
  differentialShader.uniforms.dk.value = 0.5;
  differentialShader.uniforms.kTexture.value = k1Target.texture;
  gpuCompute.doRenderTarget(differentialShader, k2Target);
  differentialShader.uniforms.dk.value = 0.5;
  differentialShader.uniforms.kTexture.value = k2Target.texture;
  gpuCompute.doRenderTarget(differentialShader, k3Target);
  differentialShader.uniforms.dk.value = 1.0;
  differentialShader.uniforms.kTexture.value = k3Target.texture;
  gpuCompute.doRenderTarget(differentialShader, k4Target);
  summarizeShader.uniforms.huvTexture.value = huv0;
  summarizeShader.uniforms.k1Texture.value = k1Target.texture;
  summarizeShader.uniforms.k2Texture.value = k2Target.texture;
  summarizeShader.uniforms.k3Texture.value = k3Target.texture;
  summarizeShader.uniforms.k4Texture.value = k4Target.texture;
  gpuCompute.doRenderTarget(summarizeShader, summaryTarget);

  controls.update();
  renderer.render(scene, camera);
});
