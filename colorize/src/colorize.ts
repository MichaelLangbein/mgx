import { Program, ArrayBundle, AttributeData, UniformData, TextureData, FramebufferObject, Context } from '@mgx/engine1';
import { rectangleA } from '../../utils/shapes';


export type ColorRamp = {val: number, rgb: [number, number, number]}[];

export class Colorizer {

    private shader: ArrayBundle;
    private context: Context;
    
    constructor(
        gl: WebGLRenderingContext,
        colorRamp: ColorRamp
    ) {

        const colorRampLength = colorRamp.length;

        const arrangementProgram = new Program(`
                precision mediump float;
                attribute vec4 a_viewPortPosition;
                uniform vec4 u_currentBbox;
                uniform vec4 u_textureBbox;
                varying vec2 v_texturePosition;
        
                vec2 clipSpace2geoPos(vec4 clipPos, vec4 geoBbox) {
                    float xRel = (clipPos[0] + 1.0) / 2.0;
                    float yRel = (clipPos[1] + 1.0) / 2.0;
                    float x = xRel * (geoBbox[2] - geoBbox[0]) + geoBbox[0];
                    float y = yRel * (geoBbox[3] - geoBbox[1]) + geoBbox[1];
                    return vec2(x, y);
                }
        
                vec2 geoPos2TexturePos(vec2 geoPos, vec4 textureBbox) {
                    float xRel = (geoPos[0] - textureBbox[0]) / (textureBbox[2] - textureBbox[0]);
                    float yRel = (geoPos[1] - textureBbox[1]) / (textureBbox[3] - textureBbox[1]);
                    return vec2(xRel, yRel);
                }
        
                void main() {
                    vec2 geoPosition = clipSpace2geoPos(a_viewPortPosition, u_currentBbox);
                    v_texturePosition = geoPos2TexturePos(geoPosition, u_textureBbox);
                    gl_Position = a_viewPortPosition;
                }
            `, `
            precision mediump float;
            uniform sampler2D u_texture;
            varying vec2 v_texturePosition;
            uniform float u_xs[${colorRampLength}];
            uniform float u_maxValue;
            uniform float u_ysR[${colorRampLength}];
            uniform float u_ysG[${colorRampLength}];
            uniform float u_ysB[${colorRampLength}];
            uniform int u_smooth;
        
            float interpolate(float x0,float y0,float x1,float y1,float x){
                float degree=(x-x0)/(x1-x0);
                float interp=degree*(y1-y0)+y0;
                return interp;
            }
        
            vec3 interpolateRangewise(float x){
                if(x<u_xs[0]){
                    float r=u_ysR[0];
                    float g=u_ysG[0];
                    float b=u_ysB[0];
                    return vec3(r,g,b);
                }
                for(int i=0;i<${colorRampLength - 1};i++){
                    if(u_xs[i]<=x&&x<u_xs[i+1]){
                        float r=interpolate(u_xs[i],u_ysR[i],u_xs[i+1],u_ysR[i+1],x);
                        float g=interpolate(u_xs[i],u_ysG[i],u_xs[i+1],u_ysG[i+1],x);
                        float b=interpolate(u_xs[i],u_ysB[i],u_xs[i+1],u_ysB[i+1],x);
                        return vec3(r,g,b);
                    }
                }
                float r=u_ysR[${colorRampLength - 1}];
                float g=u_ysG[${colorRampLength - 1}];
                float b=u_ysB[${colorRampLength - 1}];
                return vec3(r,g,b);
            }
        
            vec3 interpolateStepwise(float x){
                if(x<u_xs[0]){
                    float r=u_ysR[0];
                    float g=u_ysG[0];
                    float b=u_ysB[0];
                    return vec3(r,g,b);
                }
                for(int i=0;i<${colorRampLength - 1};i++){
                    if(u_xs[i]<=x&&x<u_xs[i+1]){
                        float r=u_ysR[i+1];
                        float g=u_ysG[i+1];
                        float b=u_ysB[i+1];
                        return vec3(r,g,b);
                    }
                }
                float r=u_ysR[${colorRampLength - 1}];
                float g=u_ysG[${colorRampLength - 1}];
                float b=u_ysB[${colorRampLength - 1}];
                return vec3(r,g,b);
            }
        
            void main(){
                vec4 texData=texture2D(u_texture,v_texturePosition);
                float val=texData[0] * u_maxValue;
                float alpha=texData[3];
                vec3 rgb;
                if(u_smooth==1){
                    rgb = interpolateRangewise(val) / 255.0;
                }else{
                    rgb = interpolateStepwise(val) / 255.0;
                }
                gl_FragColor=vec4(rgb.xyz * alpha, alpha); // I think openlayers requires pre-multiplied alpha.
            }
            `);
        
        const viewPort = rectangleA(2, 2);
        const arrangementShader = new ArrayBundle(arrangementProgram, {
            'a_viewPortPosition': new AttributeData(new Float32Array(viewPort.vertices.flat()), 'vec4', false),
        }, {
            'u_textureBbox': new UniformData('vec4',     interpolationDataGeoBbox),
            'u_currentBbox': new UniformData('vec4',     currentBbox),
            'u_xs':          new UniformData('float[]',  colorRamp.map(e => e.val)),
            'u_maxValue':    new UniformData('float',    [maxValue]),
            'u_ysR':         new UniformData('float[]',  colorRamp.map(e => e.rgb[0])),
            'u_ysG':         new UniformData('float[]',  colorRamp.map(e => e.rgb[1])),
            'u_ysB':         new UniformData('float[]',  colorRamp.map(e => e.rgb[2])),
            'u_smooth':      new UniformData('int',      [smooth ? 1 : 0]),
        }, {
            'u_texture': new TextureData(colorFb.texture)
        }, 'triangles', viewPort.vertices.length);

        const context = new Context(gl, false);

        this.shader = arrangementShader;
        this.context = context;
    }

    public render(frameBuffer?: FramebufferObject) {
        this.shader.draw(this.context, [0, 0, 0, 0], frameBuffer);
    }
}


