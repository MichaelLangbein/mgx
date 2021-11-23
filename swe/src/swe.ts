import {
    TextureData, RungeKuttaRenderer
} from '../../engine1/src/index';



export class SweRenderer {

    private rkRenderer: RungeKuttaRenderer;

    constructor(
        outputCanvas: HTMLCanvasElement,
        huv: HTMLImageElement,
        H: HTMLImageElement
    ) {

        const Hdata = [];
        const data = [];
        for (let r = 0; r < 256; r++) {
            data.push([]);
            Hdata.push([]);
            for (let c = 0; c < 256; c++) {
                if (Math.abs(r - 256 / 2) < 10 && Math.abs(c - 256 / 2) < 10) {
                    data[r].push([10.0, 0.0, 0.0, 1.0]);
                } else {
                    data[r].push([0.0, 0.0, 0.0, 1.0]);
                }
                Hdata[r].push([100, 0, 0, 1]);
            }
        }

        const code = /*glsl*/`
            float H   = texture2D(u_HTexture, v_textureCoord)[0];
            float h   = data[0];
            float u   = data[1];
            float v   = data[2];
            float hpx = data_px[0];
            float upx = data_px[1];
            float vpx = data_px[2];
            float hmx = data_mx[0];
            float umx = data_mx[1];
            float vmx = data_mx[2];
            float hpy = data_py[0];
            float upy = data_py[1];
            float vpy = data_py[2];
            float hmy = data_my[0];
            float umy = data_my[1];
            float vmy = data_my[2];
            
            float dx = 0.05;
            float dy = 0.05;
            float f = 0.001;
            float b = 0.003;
            float g = 9.831;

            float dudx = (upx - umx) / (2.0 * dx);
            float dvdy = (vpy - vmy) / (2.0 * dy);
            float dhdx = (hpx - hmx) / (2.0 * dx);
            float dhdy = (hpy - hmy) / (2.0 * dy);


            float dhdt =      - H * ( dudx + dvdy );
            float dudt = ( + f*v - b*u - g * dhdx );
            float dvdt = ( - f*u - b*v - g * dhdy );

            gl_FragColor = vec4(dhdt, dudt, dvdt, 1.0);
        `;

        const deltaT = 0.001;
        const hMin = -10;
        const hMax = 10;
        const uMin = -10;
        const uMax = 10;
        const vMin = -10;
        const vMax = 10;

        const renderer = new RungeKuttaRenderer(outputCanvas, data, deltaT, code, {
            'r': [hMin, hMax],
            'g': [uMin, uMax],
            'b': [vMin, vMax],
        }, {
            'u_HTexture': new TextureData(Hdata, 'float4')
        });
        
        this.rkRenderer = renderer;
        
    }


    public render() {
        this.rkRenderer.render();
    }

    public getImageData() {
        this.rkRenderer.getImageData();
    }
}





