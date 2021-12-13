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
  island.position.fromArray([-30, 0, 0]);
  island.renderOrder = 1.0;
  engine.scene.add(island);

  const depthTexture = values[1];
  const landTexture = values[2];

  const wMeter = 700;
  const hMeter = 400;
  const w = wMeter * 4;
  const h = hMeter * 4;
  const huv1Data = new Float32Array( w * h * 4 );
  for (let r = 0; r < h; r++) {
    for (let c = 0; c < w; c++) {
      huv1Data[(r * h + c) * 4 + 3] = 1.0;  // alpha
    }
  }
  
  const waterObject = new WaterObject(engine.renderer, w, h, wMeter, hMeter, huv1Data, landTexture, depthTexture as DataTexture, 30.0, 18.0, 210.0);
  waterObject.mesh.position.setY(-0.5);
  engine.addObject(waterObject);


  container.addEventListener('click', (evt) => {
    if (evt.ctrlKey) {
      waterObject.handleClick(evt);
    }
  })
});


//--------------------- Section 4: animation-loop -------------------------------------------------
engine.loop();

