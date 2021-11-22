#version 300 es
    precision mediump float;
    in vec2 v_textureCoord;
    uniform sampler2D u_huvTexture_initial;
    uniform sampler2D u_huvTexture_naiveProp;
    uniform sampler2D u_HTexture;
    uniform vec2 u_textureSize;
    uniform float u_g;
    uniform float u_b;
    uniform float u_f;
    uniform float u_dt;
    uniform float u_dx;
    uniform float u_dy;
    uniform vec2 u_hRange;
    uniform vec2 u_uRange;
    uniform vec2 u_vRange;
    uniform bool u_doRender;
    out vec4 fragColor;

    void main() {

        //---------------- accessing data from textures ---------------------------------
        float deltaX = 1.0 / u_textureSize[0];
        float deltaY = 1.0 / u_textureSize[1];
        vec4 huv_t         = texture( u_huvTexture_initial,   v_textureCoord                     );
        vec4 huv_tdelta    = texture( u_huvTexture_naiveProp, v_textureCoord                     );
        vec4 huv_tdelta_px = texture( u_huvTexture_naiveProp, v_textureCoord + vec2( deltaX, 0 ) );
        vec4 huv_tdelta_mx = texture( u_huvTexture_naiveProp, v_textureCoord - vec2( deltaX, 0 ) );
        vec4 huv_tdelta_py = texture( u_huvTexture_naiveProp, v_textureCoord + vec2( 0, deltaY ) );
        vec4 huv_tdelta_my = texture( u_huvTexture_naiveProp, v_textureCoord - vec2( 0, deltaY ) );
        vec4 H00           = texture( u_HTexture,             v_textureCoord                     );
        //-------------------------------------------------------------------------------


        //---------------- stretching texture values to data-range ----------------------
        float hMin        = u_hRange[0];
        float hMax        = u_hRange[1];
        float uMin        = u_uRange[0];
        float uMax        = u_uRange[1];
        float vMin        = u_vRange[0];
        float vMax        = u_vRange[1];
        float h_t         = huv_t[0];
        float u_t         = huv_t[1];
        float v_t         = huv_t[2];
        float h_tdelta    = huv_tdelta[0];
        float u_tdelta    = huv_tdelta[1];
        float v_tdelta    = huv_tdelta[2];
        float h_tdelta_px = huv_tdelta_px[0];
        float h_tdelta_mx = huv_tdelta_mx[0];
        float h_tdelta_py = huv_tdelta_py[0];
        float h_tdelta_my = huv_tdelta_my[0];
        float u_tdelta_px = huv_tdelta_px[1];
        float u_tdelta_mx = huv_tdelta_mx[1];
        float v_tdelta_py = huv_tdelta_px[2];
        float v_tdelta_my = huv_tdelta_mx[2];
        float H           = H00[0];
        float g   = u_g;
        float b   = u_b;
        float f   = u_f;
        float dt  = u_dt;
        float dx  = u_dx;
        float dy  = u_dy;
        //--------------------------------------------------------------------------------


        //---------------- actual calculations -------------------------------------------
        // 1. initial differentials from naive euler pass dxdt_t
        float dhdt_t = h_tdelta - h_t;
        float dudt_t = u_tdelta - u_t;
        float dvdt_t = v_tdelta - v_t;

        // 2. differentials at t+delta: dxdt_tdelta
        float dudx_tdelta = (u_tdelta_px - u_tdelta_mx) / (2.0 * dx);
        float dvdy_tdelta = (v_tdelta_py - v_tdelta_my) / (2.0 * dy);
        float dhdx_tdelta = (h_tdelta_px - h_tdelta_mx) / (2.0 * dx);
        float dhdy_tdelta = (h_tdelta_py - h_tdelta_my) / (2.0 * dy);

        float dhdt_tdelta = - H * ( dudx_tdelta + dvdy_tdelta );
        float dudt_tdelta =   f * v_tdelta - b * u_tdelta - g * dhdx_tdelta;
        float dvdt_tdelta = - f * u_tdelta - b * v_tdelta - g * dhdy_tdelta;

        // 3. augmented euler: mean of t and t+delta differentials
        float hNew = h_t + dt * (dhdt_t + dhdt_tdelta) / 2.0;
        float uNew = u_t + dt * (dudt_t + dudt_tdelta) / 2.0;
        float vNew = v_t + dt * (dvdt_t + dvdt_tdelta) / 2.0;
        //--------------------------------------------------------------------------------


        //---------------- compressing values down to texture-value-range ----------------
        float hTex = hNew;
        float uTex = uNew;
        float vTex = vNew;
        if (u_doRender) {
            hTex = (hTex - hMin) / (hMax - hMin);
            uTex = (uTex - uMin) / (uMax - uMin);
            vTex = (vTex - vMin) / (vMax - vMin);
            hTex = max(min(hTex, 1.0), 0.0); 
            uTex = max(min(uTex, 1.0), 0.0);
            vTex = max(min(vTex, 1.0), 0.0);
        }
        //---------------------------------------------------------------------------------

        fragColor = vec4(hTex, uTex, vTex, 1.0);
    }