import { ShaderMaterial, WebGLRenderTarget, WebGLRenderer, DataTexture, RepeatWrapping, NearestFilter, RGBAFormat, FloatType } from "three";
import { GPUComputationRenderer } from "three/examples/jsm/misc/GPUComputationRenderer";

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
            this.differentialShader.uniforms[key] = {value: this.textures[key] };
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
