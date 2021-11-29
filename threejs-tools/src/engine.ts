import { Mesh, PerspectiveCamera, Scene, TextureLoader, WebGLRenderer } from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";



export abstract class EngineObject {
    constructor(public mesh: Mesh) {}

    abstract update(time: number): void;
}




export interface EngineOptions {
    canvas: HTMLCanvasElement
};


export class Engine {
    
    renderer: WebGLRenderer;
    camera: PerspectiveCamera;
    controls: OrbitControls;
    loader: TextureLoader;
    scene: Scene;
    objects: EngineObject[] = [];

    constructor(options: EngineOptions) {


        const renderer = new WebGLRenderer({
            canvas: options.canvas,
            antialias: true, 
            alpha: true
        });
        renderer.setSize(options.canvas.clientWidth, options.canvas.clientHeight);

        const camera = new PerspectiveCamera(50, options.canvas.width / options.canvas.height, 0.001, 100);
        camera.position.fromArray([8, 8, 8]);
        camera.lookAt(0, 0, 0);

        const controls = new OrbitControls(camera, options.canvas);

        const loader = new TextureLoader();

        const scene = new Scene();

        this.renderer = renderer;
        this.camera = camera;
        this.controls = controls;
        this.loader = loader;
        this.scene = scene;
    }

    addObject(object: EngineObject) {
        this.objects.push(object);
        this.scene.add(object.mesh);
    }

    render(time: number) {
        for (const object of this.objects) {
            object.update(time);
        }
        this.controls.update();
        this.renderer.render(this.scene, this.camera);
    }

    loop() {
        this.renderer.setAnimationLoop((time, frame) => {
            this.render(time);
        });
    }
}