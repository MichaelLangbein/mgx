import { 
  AxesHelper, Color, Mesh, MeshStandardMaterial, PerspectiveCamera, 
  PlaneBufferGeometry, PointLight, Scene, ShaderChunk, ShaderLib, ShaderMaterial, UniformsUtils, WebGLRenderer 
} from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { Engine, RungeKuttaRenderer, WaterObject } from "../src";


/**
 * @TODOs
 *  - create custom-material that uses fluid-texture for normal-calculation
 */


//-------------------------- Section 1: dom-elements --------------------------------------------
const container = document.getElementById('container') as HTMLCanvasElement;


//----------------------- Section 2: threejs scaffold -------------------------------------------
const engine = new Engine({
  canvas: container
});


//---------------------- Section 3: scene-objects ------------------------------------------------

engine.scene.add(new AxesHelper(5));


const w = 256;
const h = 256;
const huv1Data = new Float32Array( w * h * 4 );
for (let r = 0; r < h; r++) {
  for (let c = 0; c < w; c++) {
    if (Math.abs(r - h/2) < 3 && Math.abs(c - h/2) < 3) {
      huv1Data[(r * h + c) * 4 + 0] = 10.0;  // red
    }
    huv1Data[(r * h + c) * 4 + 3] = 1.0;  // alpha
  }
}

const waterObject = new WaterObject(engine.renderer, w, h, huv1Data);
engine.addObject(waterObject);


//--------------------- Section 4: animation-loop -------------------------------------------------
engine.loop();
