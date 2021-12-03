import {
    DataTexture, FloatType, Mesh, NearestFilter, PlaneBufferGeometry, RepeatWrapping, RGBAFormat,
    ShaderMaterial, Texture, WebGLRenderer, WebGLRenderTarget
} from "three";
import { GPUComputationRenderer } from "three/examples/jsm/misc/GPUComputationRenderer";
import { EngineObject } from ".";


export class RungeKuttaRenderer {

    private w: number;
    private h: number;
    private differentialShader: ShaderMaterial;
    private summarizeShader: ShaderMaterial;
    private k1Target: WebGLRenderTarget;
    private k2Target: WebGLRenderTarget;
    private k3Target: WebGLRenderTarget;
    private k4Target: WebGLRenderTarget;
    private summaryTarget1: WebGLRenderTarget;
    private summaryTarget2: WebGLRenderTarget;
    private gpgpu: GPUComputationRenderer;
    private i = 0;

    constructor(renderer: WebGLRenderer, w: number, h: number, data0: Float32Array, differentialCode: string, private textures: {[key: string]: DataTexture} = {}) {
        this.w = w;
        this.h = h;

        const differentialShaderCode = `
            uniform sampler2D dataTexture;
            uniform sampler2D kTexture;
            uniform float dk;

            ${Object.keys(textures).map(t => `uniform sampler2D ${t};`).join(' ')}

            void main() {
                vec2 position = gl_FragCoord.xy / resolution.xy;
                vec2 deltaX = vec2(1.0 / resolution.x, 0.0);
                vec2 deltaY = vec2(0.0, 1.0 / resolution.y);

                float dt = 0.005;

                vec4 data    = texture2D(dataTexture, position          ) + dt * dk * texture2D(kTexture, position          );
                vec4 data_px = texture2D(dataTexture, position + deltaX ) + dt * dk * texture2D(kTexture, position + deltaX );
                vec4 data_mx = texture2D(dataTexture, position - deltaX ) + dt * dk * texture2D(kTexture, position - deltaX );
                vec4 data_py = texture2D(dataTexture, position + deltaY ) + dt * dk * texture2D(kTexture, position + deltaY );
                vec4 data_my = texture2D(dataTexture, position - deltaY ) + dt * dk * texture2D(kTexture, position - deltaY );

                ${differentialCode}
            }
        `;

        const summarizeShaderCode = `
            uniform sampler2D dataTexture;
            uniform sampler2D k1Texture;
            uniform sampler2D k2Texture;
            uniform sampler2D k3Texture;
            uniform sampler2D k4Texture;

            void main() {
                vec2 position = gl_FragCoord.xy / resolution.xy;

                float dt = 0.005;

                vec4 data = texture2D(dataTexture, position);
                vec4 k1   = texture2D(k1Texture,   position);
                vec4 k2   = texture2D(k2Texture,   position);
                vec4 k3   = texture2D(k3Texture,   position);
                vec4 k4   = texture2D(k4Texture,   position);

                vec4 weightedAverage = data + dt * (k1 + 2.0 * k2 + 2.0 * k3 + k4) / 6.0;

                gl_FragColor = vec4(weightedAverage.xyz, 1.0);
            }
        `;

        this.gpgpu = new GPUComputationRenderer(w, h, renderer);


        this.differentialShader = this.gpgpu.createShaderMaterial(differentialShaderCode, { dataTexture: { value: null }, kTexture: { value: null }, dk: { value: null } });
        this.summarizeShader = this.gpgpu.createShaderMaterial(summarizeShaderCode, { dataTexture: { value: null }, k1Texture: { value: null }, k2Texture: { value: null }, k3Texture: { value: null }, k4Texture: { value: null } });
        this.k1Target = this.gpgpu.createRenderTarget(w, h, RepeatWrapping, RepeatWrapping, NearestFilter, NearestFilter);
        this.k2Target = this.gpgpu.createRenderTarget(w, h, RepeatWrapping, RepeatWrapping, NearestFilter, NearestFilter);
        this.k3Target = this.gpgpu.createRenderTarget(w, h, RepeatWrapping, RepeatWrapping, NearestFilter, NearestFilter);
        this.k4Target = this.gpgpu.createRenderTarget(w, h, RepeatWrapping, RepeatWrapping, NearestFilter, NearestFilter);
        this.summaryTarget1 = this.gpgpu.createRenderTarget(w, h, RepeatWrapping, RepeatWrapping, NearestFilter, NearestFilter);
        this.summaryTarget2 = this.gpgpu.createRenderTarget(w, h, RepeatWrapping, RepeatWrapping, NearestFilter, NearestFilter);

        this.initTextures(data0);
    }

    getOutputTexture() {
        const { dataSource, dataSink } = this.getCurrentSourceAndSink(this.i);
        return dataSource.texture;
    }

    updateInputTexture(data: Float32Array) {
        // const {dataSource, dataSink} = this.getCurrentSourceAndSink(this.i);
        // const texture = new DataTexture(data, this.w, this.h, RGBAFormat, FloatType);
        // texture.needsUpdate = true;
        // dataSource.setTexture(texture);
        // return texture;
        this.destroyTextures();
        this.initTextures(data);
        this.i = 0;
        return this.getOutputTexture();
    }

    update() {
        const { dataSource, dataSink } = this.getCurrentSourceAndSink(this.i);

        this.differentialShader.uniforms.dataTexture.value = dataSource.texture;
        this.differentialShader.uniforms.dk.value = 0.0;
        this.gpgpu.doRenderTarget(this.differentialShader, this.k1Target);
        this.differentialShader.uniforms.dk.value = 0.5;
        this.differentialShader.uniforms.kTexture.value = this.k1Target.texture;
        this.gpgpu.doRenderTarget(this.differentialShader, this.k2Target);
        this.differentialShader.uniforms.dk.value = 0.5;
        this.differentialShader.uniforms.kTexture.value = this.k2Target.texture;
        this.gpgpu.doRenderTarget(this.differentialShader, this.k3Target);
        this.differentialShader.uniforms.dk.value = 1.0;
        this.differentialShader.uniforms.kTexture.value = this.k3Target.texture;
        this.gpgpu.doRenderTarget(this.differentialShader, this.k4Target);
        this.summarizeShader.uniforms.dataTexture.value = dataSource.texture;
        this.summarizeShader.uniforms.k1Texture.value = this.k1Target.texture;
        this.summarizeShader.uniforms.k2Texture.value = this.k2Target.texture;
        this.summarizeShader.uniforms.k3Texture.value = this.k3Target.texture;
        this.summarizeShader.uniforms.k4Texture.value = this.k4Target.texture;
        this.gpgpu.doRenderTarget(this.summarizeShader, dataSink);

        this.i += 1;
    }

    private getCurrentSourceAndSink(i: number) {
        let dataSource, dataSink;
        if (i % 2 === 0) {
            dataSource = this.summaryTarget1;
            dataSink = this.summaryTarget2;
        } else {
            dataSource = this.summaryTarget2;
            dataSink = this.summaryTarget1;
        }
        return { dataSource, dataSink };
    }

    private initTextures(data: Float32Array) {
        const data0Texture = new DataTexture(data, this.w, this.h, RGBAFormat, FloatType);
        this.differentialShader.uniforms.dataTexture.value = data0Texture;
        for (const key in this.textures) {
            this.differentialShader.uniforms[key].value = this.textures[key];
        }
        this.differentialShader.uniforms.dk.value = 0.0;
        this.gpgpu.doRenderTarget(this.differentialShader, this.k1Target);
        this.differentialShader.uniforms.dk.value = 0.5;
        this.differentialShader.uniforms.kTexture.value = this.k1Target.texture;
        this.gpgpu.doRenderTarget(this.differentialShader, this.k2Target);
        this.differentialShader.uniforms.dk.value = 0.5;
        this.differentialShader.uniforms.kTexture.value = this.k2Target.texture;
        this.gpgpu.doRenderTarget(this.differentialShader, this.k3Target);
        this.differentialShader.uniforms.dk.value = 1.0;
        this.differentialShader.uniforms.kTexture.value = this.k3Target.texture;
        this.gpgpu.doRenderTarget(this.differentialShader, this.k4Target);
        this.summarizeShader.uniforms.dataTexture.value = data0Texture;
        this.summarizeShader.uniforms.k1Texture.value = this.k1Target.texture;
        this.summarizeShader.uniforms.k2Texture.value = this.k2Target.texture;
        this.summarizeShader.uniforms.k3Texture.value = this.k3Target.texture;
        this.summarizeShader.uniforms.k4Texture.value = this.k4Target.texture;
        this.gpgpu.doRenderTarget(this.summarizeShader, this.summaryTarget1);
    }

    private destroyTextures() {
        this.k1Target.texture.dispose();
        this.k2Target.texture.dispose();
        this.k3Target.texture.dispose();
        this.k4Target.texture.dispose();
        this.summaryTarget1.texture.dispose();
        this.summaryTarget2.texture.dispose();
        // @TODO: also dispose frame-buffers here? How about user-provided textures?
    }
}




export class WaterObject extends EngineObject {
    
    private fluidSim: RungeKuttaRenderer;

    constructor(renderer: WebGLRenderer, w: number, h: number, huvData: Float32Array, groundTexture: Texture) {

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

            float H  = 15.0;
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
        const fluidSim = new RungeKuttaRenderer(renderer, w, h, huvData, fluidShader);
        //--------------------------------------------------------------------------------------------------------



        //---------------------- Step 3: custom material ---------------------------------------------------------
        const vertexShader = `
            uniform sampler2D huvData;
            varying vec3 v_normal;
            varying vec3 v_worldPosition;
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

                v_normal = surfaceNormal(sx, sy);

                vec4 adjustedPosition = vec4(position.xy, h, 1.0);
                vec4 worldPosition = modelMatrix * adjustedPosition;
                v_worldPosition = worldPosition.xyz;

                v_uv = uv;

                gl_Position = projectionMatrix * viewMatrix * worldPosition;
            }
        `;
        const fragmentShader = `
            uniform sampler2D huvData;
            uniform sampler2D groundTexture;
            uniform vec2 huvDataSize;
            uniform vec2 groundTextureSize;
            varying vec3 v_normal;
            varying vec3 v_worldPosition;
            varying vec2 v_uv;

            float angle(vec3 a, vec3 b) {
                return acos( dot(a, b) / (length(a) * length(b)) );
            }

            void main() {
                vec3 baseColor = vec3(0.0, 0.0, 1.0);

                float refractiveIndexAir = 1.0;
                float refractiveIndexWater = 1.333;
                
                vec3 up = vec3(0.0, 0.0, 1.0);
                float angleAir = angle(cameraPosition, v_normal) ;
                float angleWater = asin( sin(angleAir) * refractiveIndexAir / refractiveIndexWater );
                float angleNormal = angle( v_normal, up );
                float totalAngleWater = angleWater + angleNormal;

                float h = texture2D(huvData, v_uv).x;
                float H = 30.0;
                float depth = h + H;

                vec2 normalizedViewDirection = normalize((v_worldPosition - cameraPosition).xy);
                vec2 duv = normalizedViewDirection * depth * sin(totalAngleWater) * vec2(1.0 / groundTextureSize.x, 1.0 / groundTextureSize.y);

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
                'huvDataSize': {value: [w, h]},
                'groundTexture': { value: groundTexture },
                // 'groundTextureSize': { value: [groundTexture.image.width, groundTexture.image.height] }
                'groundTextureSize': { value: [499, 500] }
            }
        });
        const plane = new Mesh(
            new PlaneBufferGeometry(5, 5, 100, 100),
            customMaterial
        );

        //--------------------------------------------------------------------------------------------------------



        /**
         * @TODO:
         * idea:
         *  custom shader
         *  with 'underneathMe' texture = chessboard
         *  use normals and view-matrix to calculate which uv-coordinates of the chessboard to display.
         * https://www.3dgep.com/understanding-the-view-matrix/
         *  while the normals need to be passed in as a varying from the vertex shader, 
         *  the rest should be entirely doable in the fragment shader.
         * 
         *  ```glsl
         *  float angleAir = calculateAngleInFromViewMatrix(u_viewMatrix);
         *  float angleWater = refraction(angleAir, densityAir, densityWater);  // https://en.wikipedia.org/wiki/Refraction
         *  float depth = texture2D(H); // actually, this should be the depth under the touch-point... but this is probably good enough.
         *  vec2 startPoint = v_uv;
         *  vec2 touchPoint = project(startPoint, angleWater, depth);
         *  vec4 refractedPixel = texture2D(chessboard, touchPoint);
         *  ```
         */



        //--------------- Step 4: positioning and grouping -------------------------------------------------------
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