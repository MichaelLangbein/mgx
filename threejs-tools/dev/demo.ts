import { 
  AxesHelper, DataTexture, Mesh, MeshBasicMaterial,
  PlaneGeometry, Texture, TextureLoader, Vector3
} from "three";
import { Engine } from "../src";
import { AxisObject } from "../src/utils/axis";
import { WaterObject } from "../src/utils/water";
import { GLTF, GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';



//-------------------------- Section 1: dom-elements --------------------------------------------
const container = document.getElementById('container') as HTMLCanvasElement;


//----------------------- Section 2: threejs scaffold -------------------------------------------
const engine = new Engine({
  canvas: container,
  cameraPosition: [-120, 120, 200]
});


//---------------------- Section 3: scene-objects ------------------------------------------------

const gltfLoader = new GLTFLoader();
const textureLoader = new TextureLoader();

const islandObject$ = gltfLoader.loadAsync('./assets/island_glb/island.gltf');
const depthTexture$ = textureLoader.loadAsync('./assets/island_glb/depth.png');
const landTexture$ = textureLoader.loadAsync('./assets/island_glb/EXPORT_GOOGLE_SAT_WM.png');

Promise.all([islandObject$, depthTexture$, landTexture$]).then(values => {
  const island = values[0].scene.children[0];
  engine.scene.add(island);

  const depthTexture = values[1];
  const landTexture = values[2];

  const w = 256;
  const h = 256;
  const huv1Data = new Float32Array( w * h * 4 );
  for (let r = 0; r < h; r++) {
    for (let c = 0; c < w; c++) {
      if (Math.abs(r - h/2) < 3 && Math.abs(c - h/2) < 3) {
        huv1Data[(r * h + c) * 4 + 0] = 1.0;  // red
      }
      huv1Data[(r * h + c) * 4 + 3] = 1.0;  // alpha
    }
  }
  
  const waterObject = new WaterObject(engine.renderer, w, h, 700, 400, huv1Data, landTexture, depthTexture as DataTexture);
  waterObject.mesh.position.setY(-5);
  engine.addObject(waterObject);
});


//--------------------- Section 4: animation-loop -------------------------------------------------
engine.loop();

