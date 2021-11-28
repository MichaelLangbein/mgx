import { SweRenderer } from '../src/swe';
import {
  PerspectiveCamera, Scene, Mesh, WebGLRenderer, PlaneGeometry, AxesHelper,
  PointLight, CubeCamera, WebGLCubeRenderTarget, RGBFormat, LinearMipmapLinearFilter,
  CubeRefractionMapping, TextureLoader, Texture, MeshStandardMaterial, Raycaster,
  MeshPhongMaterial
} from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';


/**
 * @TODOs:
 *  - move refraction camera along with user camera, always slightly under water-surface
 */


const sweCanvas = document.createElement('canvas');
const threejsCanvas = document.getElementById('threejs_canvas') as HTMLCanvasElement;


const scene = new Scene();

const camera = new PerspectiveCamera(70, threejsCanvas.clientWidth / threejsCanvas.clientHeight, 0.01, 100);
camera.position.set(7, 3, 6);
camera.lookAt(0, 5, -5);

const light = new PointLight(0xffffff, 1.0);
light.position.set(0, 20, 30);
light.lookAt(0, 0, 0);
scene.add(light);

const renderer = new WebGLRenderer({ antialias: true, canvas: threejsCanvas });
renderer.setSize(threejsCanvas.clientWidth, threejsCanvas.clientHeight);

const controls = new OrbitControls(camera, threejsCanvas);




const huvData: number[][][] = [];
for (let r = 0; r < 256; r++) {
  huvData.push([]);
  for (let c = 0; c < 256; c++) {
    if (Math.abs(r - 230) < 5 && Math.abs(c - 127) < 5) {
      huvData[r].push([0, 0, 0, 1]);
    } else {
      huvData[r].push([0, 0, 0, 1]);
    }
  }
}

const textureLoader = new TextureLoader();
textureLoader.load('./dem.png', (demTexture: Texture) => {
  textureLoader.load('./demCutoff.png', (demCutoffTexture) => {
    textureLoader.load('./terrainTexture.png', (terrainTexture: Texture) => {
        addMeshes(huvData, sweCanvas, demTexture, demCutoffTexture, terrainTexture);
    });
  });
});

let sweRenderer: SweRenderer;

function addMeshes(
  huvImage: number[][][], sweCanvas: HTMLCanvasElement,
  demTexture: Texture, demCutoffTexture: Texture, terrainTexture: Texture
) {

  sweRenderer = new SweRenderer(sweCanvas, huvImage, demCutoffTexture.image);

  const refractionCamera = new CubeCamera(0.01, 100, new WebGLCubeRenderTarget(
    128, {
    format: RGBFormat,
    generateMipmaps: true,
    minFilter: LinearMipmapLinearFilter,
  }));
  refractionCamera.renderTarget.texture.mapping = CubeRefractionMapping;
  scene.add(refractionCamera);

  const waterGeometry = new PlaneGeometry(10, 10, 255, 255);
  const waterMaterial = new MeshPhongMaterial({
    color: 'rgb(117, 255, 250)',
    displacementMap: new Texture(sweCanvas),
    envMap: refractionCamera.renderTarget.texture,
    refractionRatio: 0.985,
    reflectivity: 0.9,
    // wireframe: true,
  });
  const waterMesh = new Mesh(waterGeometry, waterMaterial);
  waterMesh.position.set(0, 0.1, 0);
  waterMesh.lookAt(0, 1, 0);
  refractionCamera.position.set(4, -0.05, 4);
  scene.add(waterMesh);

  const ah = new AxesHelper(5);
  scene.add(ah);

  const terrainGeometry = new PlaneGeometry(10, 10, 255, 255);
  const terrainMaterial = new MeshStandardMaterial({
    color: 'white',
    displacementMap: demTexture,
    displacementScale: 2.5,
    displacementBias: 0,
    map: terrainTexture
  });
  const terrainMesh = new Mesh(terrainGeometry, terrainMaterial);
  terrainMesh.position.set(0, -0.5, 0);
  terrainMesh.lookAt(0, 10, 0);
  scene.add(terrainMesh);


  let t = 0;
  renderer.setAnimationLoop((time) => {
    sweRenderer.render(true);

    refractionCamera.position.setX( - camera.position.x * 0.5);
    refractionCamera.update(renderer, scene);
    waterMesh.material.displacementMap.needsUpdate = true;
    // waterMesh.geometry.computeVertexNormals();
    controls.update();
    renderer.render(scene, camera);

    t += 1;
  });


  const rayCaster = new Raycaster();
  threejsCanvas.addEventListener('click', (evt) => {
    
    /**
     * @TODO:
     *  - only on click, not at end of drag
     */
    const rect = threejsCanvas.getBoundingClientRect();
    const x_ = (evt.clientX - rect.left) * threejsCanvas.width  / rect.width;
    const y_ = (evt.clientY - rect.top ) * threejsCanvas.height / rect.height;
    const x = (x_ / threejsCanvas.width ) * 2 - 1;
    const y = (y_ / threejsCanvas.height) * -2 + 1;
    rayCaster.setFromCamera({x, y}, camera);
    const intersections = rayCaster.intersectObject(waterMesh);
    if (intersections && intersections[0]) {
      const intersection = intersections[0];
      const cc = 126 + (126 * intersection.point.x / 5);
      const cr = 126 + (126 * intersection.point.z / 5);
    
      const newData: number[][][] = [];  // needs to be in framebuffer-domain (-10, 10)
      const oldData = sweRenderer.getImageData() as any;  // returned in canvas-domain (0, 255)
      for (let r = 0; r < 256; r++) {
        newData.push([]);
        for (let c = 0; c < 256; c++) {
          const oldH = oldData[r * 256 * 4 + c * 4 + 0];
          const oldU = oldData[r * 256 * 4 + c * 4 + 1];
          const oldV = oldData[r * 256 * 4 + c * 4 + 2];
          if (Math.abs(r - cr) < 5 && Math.abs(c - cc) < 5) {
            newData[r].push([(oldH + 400 - 127) / 127, (oldU - 127) / 127, (oldV - 127) / 127, 1]);
          } else {
            newData[r].push([(oldH - 127) / 127, (oldU - 127) / 127, (oldV - 127) / 127, 1]);
          }
        }
      }
      sweRenderer.setHuvData(newData);
    }
  
  });
}

 
