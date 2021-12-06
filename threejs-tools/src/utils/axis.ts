import { ticks } from "d3-array";
import { Line, Vector3, BufferGeometry, LineDashedMaterial, ColorRepresentation } from "three";
import { EngineObject } from "../engine";






export interface AxisObjectOptions {
    direction: Vector3;
    range: [number, number];
    color?: ColorRepresentation;
    nrTicks?: number;
    start?: Vector3;
}



export class AxisObject extends EngineObject {
    
    private axis: Line;
    
    constructor(options: AxisObjectOptions) {


        const defaultAxisObjectOptions: AxisObjectOptions = {
            color: 'rgb(0, 0, 0)',
            direction: new Vector3(1, 0, 0),
            range: [0, 3],
            nrTicks: 3,
            start: new Vector3(0, 0, 0),
        };
        options = Object.assign(defaultAxisObjectOptions, options);

        options.direction.normalize();
        const start = options.direction.clone().multiplyScalar(options.range[0]);
        const end   = options.direction.clone().multiplyScalar(options.range[1]);

        const dx = (end.x - start.x) / options.nrTicks;
        const dy = (end.y - start.y) / options.nrTicks;
        const dz = (end.z - start.z) / options.nrTicks;
        const tickSize = 0.05 * Math.max(dx, dy, dz);

        const adx = Math.abs(dx);
        const ady = Math.abs(dy);
        const adz = Math.abs(dz);
        let normal: Vector3;
        if (Math.max(adx, adz) > ady) {
            // obtained like this:
            //   objective: get the vector v that is orthogonal to direction
            //     and normal
            //     and maximally aligned with -y
            //  For that:
            //     Use Lagrange multiplier constraint optimization
            //     maximizing f(x, z) = - sqrt(1 - x^2 - z^2)
            //     subject to g(x, z) = ax + by + cz = 0
            const a = options.direction.x;
            const b = options.direction.y;
            const c = options.direction.z;
            const xNew = - a * b / Math.sqrt( a*a*a*a + a*a*b*b + 2*a*a*c*c + b*b*c*c + c*c*c*c );
            const zNew = - b * c / Math.sqrt( (a*a + c*c) * (a*a + b*b + c*c) );
            const yNew = Math.sqrt(1 - xNew*xNew - zNew*zNew);
            normal = new Vector3(xNew, yNew, zNew).normalize().multiplyScalar(tickSize);
        } else {
            // equivalent to above, but maximally aligned with x-axis
            const a = options.direction.y;
            const b = options.direction.x;
            const c = options.direction.z;
            const yNew = - a * b / Math.sqrt( a*a*a*a + a*a*b*b + 2*a*a*c*c + b*b*c*c + c*c*c*c );
            const zNew = - b * c / Math.sqrt( (a*a + c*c) * (a*a + b*b + c*c) );
            const xNew = Math.sqrt(1 - yNew*yNew - zNew*zNew);
            normal = new Vector3(xNew, yNew, zNew).normalize().multiplyScalar(tickSize);
        }

        const axisPoints = [start];
        for (let i = 1; i < options.nrTicks; i++) {
            
            const p0 = new Vector3(
                start.x +  i * dx,
                start.y +  i * dy,
                start.z +  i * dz
            );

            const p1 = p0.clone().add(normal);

            axisPoints.push(
                p0, p1, p0
            );
        }

        const axisGeometry = new BufferGeometry().setFromPoints(axisPoints);
        const axisMaterial = new LineDashedMaterial({ color: options.color });
        const axis = new Line(axisGeometry, axisMaterial);

        super(axis);
        this.axis = axis;
    }


    update(time: number): void {

    }
}