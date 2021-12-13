import { Engine } from "../src";
import { BoxGeometry, FileLoader, Mesh, MeshBasicMaterial, SphereBufferGeometry } from 'three';


const canvas = document.getElementById('container') as HTMLCanvasElement;

const engine = new Engine({
    canvas,
    cameraPosition: [255, 255, 255]
});


engine.loop();

const loader = new FileLoader();
loader.load('./assets/colors_complete.json', (response: string) => {
    const data = JSON.parse(response);
    
    let bubbles: Mesh[] = [];
    for (const entry of data) {
        const geometry = new SphereBufferGeometry(3);
        const material = new MeshBasicMaterial({
            color: entry.code
        });
        const mesh = new Mesh(geometry, material);
        // @ts-ignore
        mesh.props = entry;

        const angle = entry.hsl[0];
        const radius = entry.hsl[1];
        const height = entry.hsl[2];
        const x = radius * Math.cos(angle * 2 * Math.PI / 360);
        const z = radius * Math.sin(angle * 2 * Math.PI / 360);
        const y = height;
        mesh.position.fromArray([x, y, z]);
        bubbles.push(mesh);
        engine.scene.add(mesh);
    }


    canvas.addEventListener('mousemove', (evt) => {
        const intersections = engine.getIntersections(evt, bubbles);
        if (intersections && intersections[0]) {
            const intersection = intersections[0];
                    // @ts-ignore
            console.log(intersection.object.props.name);
        }
    }); 
});
