precision mediump float;
    varying vec2 v_textureCoord;
    uniform sampler2D u_huvTexture;
    uniform sampler2D u_HTexture;
    uniform vec2 u_textureSize;
    uniform float u_g;
    uniform float u_b;
    uniform float u_f;
    uniform float u_dt;
    uniform float u_dx;
    uniform float u_dy;
    uniform float hMax;
    uniform float hMin;
    uniform float uMax;
    uniform float uMin;
    uniform float vMax;
    uniform float vMin;
    
    void main() {
        float deltaX = 1.0 / u_textureSize[0];
        float deltaY = 1.0 / u_textureSize[1];

        vec4 huv = texture2D(u_huvTexture, v_textureCoord);
        vec4 huvpx = texture2D(u_huvTexture, v_textureCoord + vec2(deltaX, 0));
        vec4 huvpy = texture2D(u_huvTexture, v_textureCoord + vec2(0, deltaY));
        vec4 huvmx = texture2D(u_huvTexture, v_textureCoord - vec2(deltaX, 0));
        vec4 huvmy = texture2D(u_huvTexture, v_textureCoord - vec2(0, deltaY));
        vec4 H00 = texture2D(u_HTexture, v_textureCoord);

        float h   = (hMax - hMin) * huv[0]   + hMin;
        float u   = (uMax - uMin) * huv[1]   + uMin;
        float v   = (vMax - vMin) * huv[2]   + vMin;
        float hxp = (hMax - hMin) * huvpx[0] + hMin;
        float hyp = (hMax - hMin) * huvpy[0] + hMin;
        float uxp = (uMax - uMin) * huvpx[1] + uMin;
        float vyp = (vMax - vMin) * huvpy[2] + vMin;
        float hxm = (hMax - hMin) * huvmx[0] + hMin;
        float hym = (hMax - hMin) * huvmy[0] + hMin;
        float uxm = (uMax - uMin) * huvmx[1] + uMin;
        float vym = (vMax - vMin) * huvmy[2] + vMin;
        float H   = H00[0];
        float g   = u_g;
        float b   = u_b;
        float f   = u_f;
        float dt  = u_dt;
        float dx  = u_dx;
        float dy  = u_dy;

        float dudx = (uxp - uxm) / (2.0 * dx);
        float dvdy = (vyp - vym) / (2.0 * dy);
        float dhdx = (hxp - hxm) / (2.0 * dx);
        float dhdy = (hyp - hym) / (2.0 * dy); 
        float hNew =      - H * ( dudx + dvdy ) * dt + h;
        float uNew = ( + f*v - b*u - g * dhdx ) * dt + u;
        float vNew = ( - f*u - b*v - g * dhdy ) * dt + v;

        float hTex = (hNew - hMin) / (hMax - hMin);
        float uTex = (uNew - uMin) / (uMax - uMin);
        float vTex = (vNew - vMin) / (vMax - vMin);
        hTex = max(min(hTex, hMax), hMin); 
        uTex = max(min(uTex, uMax), uMin);
        vTex = max(min(vTex, vMax), vMin); 

        gl_FragColor = vec4(hTex, uTex, vTex, 1.0);
    }