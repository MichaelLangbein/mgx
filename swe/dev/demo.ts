import { SweRenderer } from '../src/swe';
import {
  PerspectiveCamera, Scene, Mesh, WebGLRenderer, PlaneGeometry, AxesHelper,
  PointLight, CubeCamera, WebGLCubeRenderTarget, RGBFormat, LinearMipmapLinearFilter,
  CubeRefractionMapping, MeshBasicMaterial, TextureLoader, Texture, MeshStandardMaterial
} from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';


/**
 * @TODOs:
 *  - move refraction camera along with user camera, always slightly under water-surface
 *  - handle edge-conditions so waves don't over-exaggerate
 *  - allow touching water-surface
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
  huvData: number[][][], sweCanvas: HTMLCanvasElement,
  demTexture: Texture, demCutoffTexture: Texture, terrainTexture: Texture
) {

  sweRenderer = new SweRenderer(sweCanvas, huvData, demCutoffTexture.image);

  const refractionCamera = new CubeCamera(0.01, 100, new WebGLCubeRenderTarget(
    128, {
    format: RGBFormat,
    generateMipmaps: true,
    minFilter: LinearMipmapLinearFilter,
  }));
  refractionCamera.renderTarget.texture.mapping = CubeRefractionMapping;
  scene.add(refractionCamera);

  const waterGeometry = new PlaneGeometry(10, 10, 255, 255);
  const waterMaterial = new MeshBasicMaterial({
    color: 'rgb(117, 255, 250)',
    envMap: refractionCamera.renderTarget.texture,
    refractionRatio: 0.985,
    reflectivity: 0.9
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
    displacementBias: -0.8,
    map: terrainTexture
  });
  const terrainMesh = new Mesh(terrainGeometry, terrainMaterial);
  terrainMesh.position.set(0, -0.5, 0);
  terrainMesh.lookAt(0, 10, 0);
  scene.add(terrainMesh);


  let t = 0;
  renderer.setAnimationLoop((time) => {
    sweRenderer.render();

    if (t % 5 === 0) {
      const sweData = sweRenderer.getImageData() as any;
      const oldPositions = waterMesh.geometry.getAttribute('position');
      for (let i = 0; i < oldPositions.count; i++) {
        const h = sweData[i * 4];
        oldPositions.setZ(i, h / 1);
      }
      oldPositions.needsUpdate = true;
      waterMesh.geometry.computeVertexNormals();
    }

    controls.update();
    refractionCamera.update(renderer, scene);
    renderer.render(scene, camera);

    t += 1;
  });
}


threejsCanvas.addEventListener('click', () => {
  
  const huvData: number[][][] = [];
  for (let r = 0; r < 256; r++) {
    huvData.push([]);
    for (let c = 0; c < 256; c++) {
      if (Math.abs(r - 28) < 5 && Math.abs(c - 28) < 5) {
        huvData[r].push([1, 0, 0, 1]);
      } else {
        huvData[r].push([0, 0, 0, 1]);
      }
    }
  }

  sweRenderer.setHuvData(huvData);
});
