    precision mediump float;
    varying vec2 v_textureCoord;
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
    uniform float u_HMax;
    
    void main() {

        //---------------- accessing data from textures ---------------------------------
        float deltaX = 1.0 / u_textureSize[0];
        float deltaY = 1.0 / u_textureSize[1];
        vec4 huv_t         = texture2D( u_huvTexture_initial,   v_textureCoord                     );
        vec4 huv_tdelta    = texture2D( u_huvTexture_naiveProp, v_textureCoord                     );
        vec4 huv_tdelta_px = texture2D( u_huvTexture_naiveProp, v_textureCoord + vec2( deltaX, 0 ) );
        vec4 huv_tdelta_mx = texture2D( u_huvTexture_naiveProp, v_textureCoord - vec2( deltaX, 0 ) );
        vec4 huv_tdelta_py = texture2D( u_huvTexture_naiveProp, v_textureCoord + vec2( 0, deltaY ) );
        vec4 huv_tdelta_my = texture2D( u_huvTexture_naiveProp, v_textureCoord - vec2( 0, deltaY ) );
        vec4 H_            = texture2D( u_HTexture,             v_textureCoord                     );
        //-------------------------------------------------------------------------------


        //---------------- stretching texture values to data-range ----------------------
        float hMin        = u_hRange[0];
        float hMax        = u_hRange[1];
        float uMin        = u_uRange[0];
        float uMax        = u_uRange[1];
        float vMin        = u_vRange[0];
        float vMax        = u_vRange[1];
        float h_t         = (hMax - hMin) * huv_t[0]         + hMin;
        float u_t         = (uMax - uMin) * huv_t[1]         + uMin;
        float v_t         = (vMax - vMin) * huv_t[2]         + vMin;
        float h_tdelta    = (hMax - hMin) * huv_tdelta[0]    + hMin;
        float u_tdelta    = (uMax - uMin) * huv_tdelta[1]    + uMin;
        float v_tdelta    = (vMax - vMin) * huv_tdelta[2]    + vMin;
        float h_tdelta_px = (hMax - hMin) * huv_tdelta_px[0] + hMin;
        float h_tdelta_mx = (hMax - hMin) * huv_tdelta_mx[0] + hMin;
        float h_tdelta_py = (hMax - hMin) * huv_tdelta_py[0] + hMin;
        float h_tdelta_my = (hMax - hMin) * huv_tdelta_my[0] + hMin;
        float u_tdelta_px = (uMax - uMin) * huv_tdelta_px[1] + uMin;
        float u_tdelta_mx = (uMax - uMin) * huv_tdelta_mx[1] + uMin;
        float v_tdelta_py = (vMax - vMin) * huv_tdelta_px[2] + vMin;
        float v_tdelta_my = (vMax - vMin) * huv_tdelta_mx[2] + vMin;
        float H           = H_[0] * u_HMax;
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
        float hTex = (hNew - hMin) / (hMax - hMin);
        float uTex = (uNew - uMin) / (uMax - uMin);
        float vTex = (vNew - vMin) / (vMax - vMin);
        hTex = max(min(hTex, 1.0), 0.0); 
        uTex = max(min(uTex, 1.0), 0.0);
        vTex = max(min(vTex, 1.0), 0.0);
        //---------------------------------------------------------------------------------

        gl_FragColor = vec4(hTex, uTex, vTex, 1.0);
    }