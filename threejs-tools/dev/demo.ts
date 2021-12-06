import { scaleLinear } from "d3-scale";
import { 
  AxesHelper, Mesh, MeshBasicMaterial,
  PlaneGeometry, Texture, TextureLoader, Vector3
} from "three";
import { Engine } from "../src";
import { AxisObject } from "../src/utils/axis";
import { WaterObject } from "../src/utils/water";




//-------------------------- Section 1: dom-elements --------------------------------------------
const container = document.getElementById('container') as HTMLCanvasElement;


//----------------------- Section 2: threejs scaffold -------------------------------------------
const engine = new Engine({
  canvas: container
});
const loader = new TextureLoader();
loader.load('./board2.jpg', (boardTexture) => addElements(boardTexture));


//---------------------- Section 3: scene-objects ------------------------------------------------
const xAxis = new AxisObject({
  direction: new Vector3(1, 0, 0),
  range: [0, 5]
});
engine.addObject(xAxis);
const yAxis = new AxisObject({
  direction: new Vector3(0.3, 1, 0.3),
  range: [0, 5]
});
engine.addObject(yAxis);
const zAxis = new AxisObject({
  direction: new Vector3(1, 0.3, 1),
  range: [0, 5]
});
engine.addObject(zAxis);

function addElements(boardTexture: Texture) {

  const plane = new Mesh(
    new PlaneGeometry(5, 5, 2, 2),
    new MeshBasicMaterial({
      map: boardTexture
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
  
  const waterObject = new WaterObject(engine.renderer, w, h, 5, 5, huv1Data, boardTexture);
  waterObject.mesh.position.setY(1);
  engine.addObject(waterObject);
}



//--------------------- Section 4: animation-loop -------------------------------------------------
engine.loop();

