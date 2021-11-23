precision mediump float;
                varying vec2 v_textureCoord;
                uniform sampler2D u_data;
                uniform sampler2D u_k1;
                uniform sampler2D u_k2;
                uniform sampler2D u_k3;
                uniform sampler2D u_k4;
                uniform vec2 u_RRange;
                uniform vec2 u_GRange;
                uniform vec2 u_BRange;
                uniform float u_toCanvas;

                void main() {

                    vec4 data = texture2D(u_data, v_textureCoord);
                    vec4 k1   = texture2D(u_k1,   v_textureCoord);
                    vec4 k2   = texture2D(u_k2,   v_textureCoord);
                    vec4 k3   = texture2D(u_k3,   v_textureCoord);
                    vec4 k4   = texture2D(u_k4,   v_textureCoord);

                    vec4 weightedAverage = data + dt * (k1 + 2.0 * k2 + 2.0 * k3 + k4) / 6.0;

                    if (u_toCanvas > 0.5) {
                        float rNorm = (weightedAverage.x - u_RRange[0]) / (u_RRange[1] - u_RRange[0]);
                        float gNorm = (weightedAverage.y - u_GRange[0]) / (u_GRange[1] - u_GRange[0]);
                        float bNorm = (weightedAverage.z - u_BRange[0]) / (u_BRange[1] - u_BRange[0]);
                        gl_FragColor = vec4(rNorm, gNorm, bNorm, 1.0);
                    } else {
                        gl_FragColor = weightedAverage;
                    }
                }