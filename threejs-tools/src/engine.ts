import { Mesh, Object3D, PerspectiveCamera, PointLight, Scene, WebGLRenderer } from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";



export abstract class EngineObject {
    protected engine: Engine;

    constructor(public mesh: Object3D) {}

    abstract update(timeSinceAppStart: number): void;

    setEngine(engine: Engine) {
        this.engine = engine;
    }
}




export interface EngineOptions {
    canvas: HTMLCanvasElement
};


export class Engine {
    
    renderer: WebGLRenderer;
    camera: PerspectiveCamera;
    controls: OrbitControls;
    scene: Scene;
    objects: EngineObject[] = [];
    light: PointLight;

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

        const scene = new Scene();

        const light = new PointLight('#ffffff', 1);
        light.position.fromArray([0, 10, 0]);
        scene.add(light);

        this.renderer = renderer;
        this.camera = camera;
        this.controls = controls;
        this.scene = scene;
        this.light = light;
    }

    addObject(object: EngineObject) {
        this.objects.push(object);
        object.setEngine(this);
        this.scene.add(object.mesh);
    }

    render(timeSinceAppStart: number) {
        for (const object of this.objects) {
            object.update(timeSinceAppStart);
        }
        this.controls.update();
        this.renderer.render(this.scene, this.camera);
    }

    loop() {
        this.renderer.setAnimationLoop((timeSinceAppStart, frame) => {
            this.render(timeSinceAppStart);
        });
    }
}
