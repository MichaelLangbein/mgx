import { AxesHelper, DataTexture, FloatType, Mesh, MeshStandardMaterial, NearestFilter, PerspectiveCamera, PlaneBufferGeometry, PointLight, RGBAFormat, Scene, Texture, TextureLoader, WebGLRenderer } from "three";
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


const golShader = /*glsl*/`
  bool closeTo(float value, float target, float maxDiff) {
    float diff = abs(value - target);
    if ( diff <= maxDiff ) {
      return true;
    }
    return false;
  }

  void main() {
    float deltaX = 1.0 / resolution.x;
    float deltaY = 1.0 / resolution.y;
    vec2 fragCoord = gl_FragCoord.xy / resolution.xy;
    float state00 = texture(state, fragCoord.xy + vec2(      0.0, 0.0      ) ).x;
    float statem0 = texture(state, fragCoord.xy + vec2( - deltaX, 0.0      ) ).x;
    float statep0 = texture(state, fragCoord.xy + vec2( + deltaX, 0.0      ) ).x;
    float state0m = texture(state, fragCoord.xy + vec2(      0.0, - deltaY ) ).x;
    float state0p = texture(state, fragCoord.xy + vec2(      0.0, + deltaY ) ).x;
    float statemm = texture(state, fragCoord.xy + vec2( - deltaX, - deltaY ) ).x;
    float statemp = texture(state, fragCoord.xy + vec2( - deltaX, + deltaY ) ).x;
    float statepp = texture(state, fragCoord.xy + vec2( + deltaX, + deltaY ) ).x;
    float statepm = texture(state, fragCoord.xy + vec2( + deltaX, - deltaY ) ).x;
    float sum = state00 + statem0 + statep0 + state0m + state0p + statemm + statemp + statepp + statepm;

    gl_FragColor = vec4(state00, 0.0, 0.0, 1.0);
    if ( closeTo(state00, 1.0, 0.1) ) {           // alive
      if (sum < 2.0) {
        gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);  // died from loneliness
      }
      else if (sum > 3.0) {
        gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);  // died from overcrowding
      }
    } else {                                      // dead
      if ( closeTo(sum, 3.0, 0.1) ) {
        gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);  // reborn
      }
    }
  }
`;
const w = 100;
const h = 100;
const state0Data = new Float32Array( w * h * 4 );
for (let r = 0; r < h; r++) {
  for (let c = 0; c < w; c++) {
    state0Data[(r * h + c) * 4 + 0] = Math.random() > 0.1 ? 1.0 : 0.0;  // red
    state0Data[(r * h + c) * 4 + 3] = 1.0;                              // alpha
  }
}
const gpgpu = new GPUComputationRenderer(w, h, renderer);
const state0 = new DataTexture(state0Data, w, h, RGBAFormat, FloatType);
const state = gpgpu.addVariable('state', golShader, state0);
gpgpu.setVariableDependencies(state, [state]);
const error = gpgpu.init();
if (error !== null) {
  console.error(error);
}


const plane = new Mesh(
  new PlaneBufferGeometry(5, 5, 2, 2),
  new MeshStandardMaterial({
    color: 'rgb(117, 255, 250)',
    refractionRatio: 0.985,
    map: gpgpu.getCurrentRenderTarget(state).texture
  })
);
plane.position.set(0, 0, 0);
plane.lookAt(0, 1, 0);
scene.add(plane);

const ah = new AxesHelper(5);
scene.add(ah);


//--------------------- Section 4: animation-loop -------------------------------------------------
renderer.setAnimationLoop((time, frame) => {
  gpgpu.compute();
  controls.update();
  renderer.render(scene, camera);
});
