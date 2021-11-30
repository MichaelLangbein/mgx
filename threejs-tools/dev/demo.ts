import { 
  AxesHelper, Mesh, MeshBasicMaterial,
  PlaneGeometry, TextureLoader
} from "three";
import { Engine, WaterObject } from "../src";




//-------------------------- Section 1: dom-elements --------------------------------------------
const container = document.getElementById('container') as HTMLCanvasElement;


//----------------------- Section 2: threejs scaffold -------------------------------------------
const engine = new Engine({
  canvas: container
});
const loader = new TextureLoader();


//---------------------- Section 3: scene-objects ------------------------------------------------

engine.scene.add(new AxesHelper(5));

const plane = new Mesh(
  new PlaneGeometry(5, 5, 2, 2),
  new MeshBasicMaterial({
    map: loader.load('./board.jpg')
  })
);
plane.lookAt(0, 1, 0);
engine.scene.add(plane);


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

const waterObject = new WaterObject(engine.renderer, w, h, huv1Data);
waterObject.mesh.position.setY(1);
engine.addObject(waterObject);


//--------------------- Section 4: animation-loop -------------------------------------------------
engine.loop();
