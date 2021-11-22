precision mediump float;
uniform sampler2D u_texture;
uniform vec2 u_textureSize;
varying vec2 v_textureCoord;

void main() {

    vec2 deltaX = vec2(1.0 / u_textureSize.x, 0.0);
    vec2 deltaY = vec2(0.0, 1.0 / u_textureSize.y);
    vec4 texData00 = texture2D(u_texture, v_textureCoord );
    vec4 texDataPX = texture2D(u_texture, v_textureCoord + deltaX);
    vec4 texDataMX = texture2D(u_texture, v_textureCoord - deltaX);
    vec4 texDataPY = texture2D(u_texture, v_textureCoord + deltaY);
    vec4 texDataMY = texture2D(u_texture, v_textureCoord - deltaY);

    gl_FragColor = 0.25 * (texData00 + texDataPX + texDataMX + texDataPX + texDataMY);
    gl_FragColor = gl_FragColor * 0.0 + texData00;
}