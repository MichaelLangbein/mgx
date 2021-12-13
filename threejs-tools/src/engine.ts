import { DirectionalLight, Intersection, Light, Mesh, Object3D, PerspectiveCamera, PointLight, Raycaster, Scene, WebGLRenderer } from "three";
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
    canvas: HTMLCanvasElement,
    cameraPosition?: [number, number, number],
    lightPosition?: [number, number, number],
};


export class Engine {
    
    renderer: WebGLRenderer;
    camera: PerspectiveCamera;
    controls: OrbitControls;
    scene: Scene;
    objects: EngineObject[] = [];
    light: Light;
    rayCaster: Raycaster;

    constructor(public options: EngineOptions) {

        options = Object.assign({
            cameraPosition: [10, 10, 10],
            lightPosition: [0, 30, 0]
        }, options);


        const renderer = new WebGLRenderer({
            canvas: options.canvas,
            antialias: true, 
            alpha: true
        });
        renderer.setSize(options.canvas.clientWidth, options.canvas.clientHeight);

        const camera = new PerspectiveCamera(50, options.canvas.width / options.canvas.height, 0.01, 1000);
        camera.position.fromArray(options.cameraPosition);
        camera.lookAt(0, 0, 0);

        const controls = new OrbitControls(camera, options.canvas);

        const scene = new Scene();

        const light = new DirectionalLight('#ffffff', 2);
        light.position.fromArray(options.lightPosition);
        scene.add(light);

        const rayCaster = new Raycaster();

        this.renderer = renderer;
        this.camera = camera;
        this.controls = controls;
        this.scene = scene;
        this.light = light;
        this.rayCaster = rayCaster;
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

    getIntersections<T extends Object3D>(evt: MouseEvent, candidateObjects: T[]): Intersection<T>[] {
        const canvas = this.options.canvas;
        const rect = canvas.getBoundingClientRect();
        const x_ = (evt.clientX - rect.left) * canvas.width  / rect.width;
        const y_ = (evt.clientY - rect.top ) * canvas.height / rect.height;
        const x = (x_ / canvas.width ) * 2 - 1;
        const y = (y_ / canvas.height) * -2 + 1;
        this.rayCaster.setFromCamera({x, y}, this.camera);
        const intersections = this.rayCaster.intersectObjects<T>(candidateObjects);
        return intersections;
    }
}
