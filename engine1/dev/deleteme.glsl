precision mediump float;
                varying vec2 v_textureCoord;
                uniform float u_dt;
                uniform float u_kFactor;
                uniform vec2 u_textureSize;
                uniform sampler2D u_dataTexture;
                uniform sampler2D u_kTexture;
                 uniform sampler2D u_HTexture; 


                void main() {

                    vec2 deltaX = vec2(1.0 / u_textureSize.x, 0.0);
                    vec2 deltaY = vec2(0.0, 1.0 / u_textureSize.y);
                    vec4 data    = texture2D(u_dataTexture, v_textureCoord          ) + u_dt * u_kFactor * texture2D(u_kTexture, v_textureCoord          );
                    vec4 data_px = texture2D(u_dataTexture, v_textureCoord + deltaX ) + u_dt * u_kFactor * texture2D(u_kTexture, v_textureCoord + deltaX );
                    vec4 data_mx = texture2D(u_dataTexture, v_textureCoord - deltaX ) + u_dt * u_kFactor * texture2D(u_kTexture, v_textureCoord - deltaX );
                    vec4 data_py = texture2D(u_dataTexture, v_textureCoord + deltaY ) + u_dt * u_kFactor * texture2D(u_kTexture, v_textureCoord + deltaY );
                    vec4 data_my = texture2D(u_dataTexture, v_textureCoord - deltaY ) + u_dt * u_kFactor * texture2D(u_kTexture, v_textureCoord - deltaY );

                    //------------------ replace this section with your own, custom code --------------------------------------------------
                    
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

                    //---------------------------------------------------------------------------------------------------------------------
                }