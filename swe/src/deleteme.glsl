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
    
    void main() {
        float deltaX = 1.0 / u_textureSize[0];
        float deltaY = 1.0 / u_textureSize[1];

        vec4 huv = texture2D(u_huvTexture, v_textureCoord);
        vec4 huvx1 = texture2D(u_huvTexture, v_textureCoord + vec2(deltaX, 0));
        vec4 huvy1 = texture2D(u_huvTexture, v_textureCoord + vec2(0, deltaY));
        vec4 H00 = texture2D(u_HTexture, v_textureCoord);

        float h = huv[0];
        float u = huv[1];
        float v = huv[2];
        float hx1 = huvx1[0];
        float hy1 = huvy1[0];
        float ux1 = huvx1[1];
        float vy1 = huvy1[2];
        float H = H00[0];
        float g = u_g;
        float b = u_b;
        float f = u_f;
        float dt = u_dt;
        float dx = u_dx;
        float dy = u_dy;

        float hNew = ( h - H * ( ((ux1 - u)/dx) + ((vy1 - v)/dy) ) ) * dt;
        float uNew = (  f*v - b*u - g*((hx1 - h)/dx) + u ) * dt;
        float vNew = ( -f*u - b*v - g*((hy1 - h)/dy) + v ) * dt;

        gl_FragColor = vec4(hNew, uNew, vNew, 1.0);
    }