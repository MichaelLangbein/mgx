import { WebGLRenderer, Texture, ShaderMaterial, Mesh, PlaneBufferGeometry, DataTexture } from "three";
import { EngineObject } from "..";
import { RungeKuttaRenderer } from "./rungeKutta";



export class WaterObject extends EngineObject {
    
    private fluidSim: RungeKuttaRenderer;

    constructor(renderer: WebGLRenderer, wPixels: number, hPixels: number, wMeter: number, hMeter: number, huvData: Float32Array, groundTexture: Texture, depthTexture: DataTexture) {

        //------------------------ Step 1: fluid-motion compute-shader -------------------------------------------
        const fluidShader = `
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

            float H_tex = texture2D(hTexture, position).x;
            float H  = 10.714 - H_tex * 10.0 / 168.0;
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
            
            float easing = 0.03;
            dhdt = (1.0 - easing) * dhdt - easing * h;
            // dudt = (1.0 - easing) * dhdt - easing * u;
            // dvdt = (1.0 - easing) * dhdt - easing * v;


            float d = 1.5 * 1.0 / resolution.x;
            if(position.x <= d || position.x > 1.0 - d ||
                position.y <= d || position.y > 1.0 - d    ) {
                    dhdt = 0.0;
                    dudt = 0.0;
                    dvdt = 0.0;
            }


            gl_FragColor = vec4(dhdt, dudt, dvdt, 1.0);
        `;
        const fluidSim = new RungeKuttaRenderer(renderer, wPixels, hPixels, huvData, fluidShader, { 'hTexture': depthTexture });
        //--------------------------------------------------------------------------------------------------------



        //---------------------- Step 2: water material ---------------------------------------------------------
        /**
         * MS: modelSpace
         * WS: worldSpace
         * CS: cameraSpace
         * SS: screenSpace = clippingSpace
         */
        const vertexShader = `
            uniform sampler2D huvData;
            varying vec3 v_normalWS;
            varying vec3 v_positionWS;
            varying vec2 v_uv;
            uniform vec2 huvDataSize;
            uniform vec2 groundTextureDataSize;

            vec3 surfaceNormal(vec3 a, vec3 b) {
                return normalize(cross(a, b));
            }

            void main()	{
                float dx = 1.0 / huvDataSize.x;
                float dy = 1.0 / huvDataSize.y;
                vec2 deltaX = vec2(dx, 0.0);
                vec2 deltaY = vec2(0.0, dy);

                float h    = texture2D(huvData, uv          ).x;
                float h_px = texture2D(huvData, uv + deltaX ).x;
                float h_py = texture2D(huvData, uv + deltaY ).x;

                vec3 sx = vec3(dx, 0.0, h_px - h);
                vec3 sy = vec3(0.0, dy, h_py - h);
                vec3 normalMS = surfaceNormal(sx, sy);
                

                vec4 adjustedPositionMS = vec4(position.xy, h, 1.0);
                vec4 adjustedPositionWS = modelMatrix * adjustedPositionMS; 
                vec4 adjustedPositionCS = viewMatrix * adjustedPositionWS;
                vec4 adjustedPositionSS = projectionMatrix * adjustedPositionCS;
                gl_Position = adjustedPositionSS;
                

                v_uv = uv;
                v_positionWS = adjustedPositionWS.xyz;
                v_normalWS = normalize ( (modelMatrix * vec4(normalMS, 1.0)).xyz );
            }
        `;
        const fragmentShader = `
            uniform sampler2D huvData;
            uniform sampler2D groundTexture;
            uniform vec2 huvDataSize;
            uniform vec2 groundTextureSize;
            uniform vec2 fieldDimensionsMeter;
            varying vec3 v_normalWS;
            varying vec3 v_positionWS;
            varying vec2 v_uv;

            float angle(vec3 a, vec3 b) {
                return acos( dot(a, b) / (length(a) * length(b)) );
            }

            void main() {
                vec3 baseColor = vec3(0.0, 0.8, 1.0);

                vec3 cameraPositionWS = cameraPosition;

                vec3 viewDirectionWS = v_positionWS - cameraPositionWS;
                
                float refractiveIndexAir = 1.0;
                float refractiveIndexWater = 1.333;
                
                vec3 upWS             = vec3( 0.0, 1.0, 0.0 );
                float angleAir        = angle( -viewDirectionWS, v_normalWS );
                float angleWater      = asin( sin(angleAir) * refractiveIndexAir / refractiveIndexWater );
                float angleNormal     = angle( v_normalWS, upWS );
                float totalAngleWater = angleWater + angleNormal;
                
                float h     = texture2D(huvData, v_uv).x;
                float H     = 1.0;
                float depth = h + H;
                float lengthRayInWater              = depth / cos(totalAngleWater);                   // <-- assumes that depth on touch-point is the same as here ... which is good enough, I guess.
                float distanceOnGround              = lengthRayInWater * sin(totalAngleWater);
                float distanceOnGroundNormalized    = distanceOnGround / max(fieldDimensionsMeter.x, fieldDimensionsMeter.y);
                vec2 viewDirectionGroundNormalized  = normalize((viewDirectionWS).xz);
                vec2 duv = viewDirectionGroundNormalized * distanceOnGroundNormalized;
                duv.y = - duv.y;                                                        // <-- texture-coordinates have (0/0) at the top left: https://webglfundamentals.org/webgl/lessons/webgl-3d-textures.html

                vec3 camData = texture2D(groundTexture, v_uv + duv).xyz;

                float transparency = 0.5;
                vec3 color = transparency * camData + (1.0 - transparency) * baseColor;

                float heightFactor = h / 0.125;
                color = (1.0 - heightFactor) * color + heightFactor * vec3(1.0, 1.0, 1.0);
                gl_FragColor = vec4(color, 1.0);
            }
        `;
        const customMaterial = new ShaderMaterial({
            fragmentShader,
            vertexShader,
            uniforms: {
                'huvData': {value: fluidSim.getOutputTexture()},
                'huvDataSize': {value: [wPixels, hPixels]},
                'groundTexture': { value: groundTexture },
                'groundTextureSize': { value: [groundTexture.image.width, groundTexture.image.height] },
                'fieldDimensionsMeter': { value: [wMeter, hMeter] }
            }
        });
        const plane = new Mesh(
            new PlaneBufferGeometry(wMeter, hMeter, 100, 100),
            customMaterial
        );

        //--------------------------------------------------------------------------------------------------------

        //--------------- Step 3: positioning and grouping -------------------------------------------------------
        plane.position.set(0, 0, 0);
        plane.lookAt(0, 10, 0);
        //--------------------------------------------------------------------------------------------------------

        super(plane);

        this.fluidSim = fluidSim;
    }

    update(time: number): void {
        this.fluidSim.update();
    }

    handleClick(evt: any) {
        // container.addEventListener('click', (evt) => {
        //     plane.material.uniforms['huvData'].value = fluidSim.updateInputTexture(huv1Data);
        //     plane.material.needsUpdate = true;
        // });
    }

}