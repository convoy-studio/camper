precision mediump float;

varying vec2 vTextureCoord;
uniform vec2 resolution;
uniform sampler2D uSampler;
// uniform sampler2D uDisplacement;
uniform float time;
uniform float zoom;
uniform float brightness;
uniform float twirl;
uniform float iterations;

void main(void) {
    vec2 p = -1.0 + 2.0 * vTextureCoord.xy;
    vec2 uv;
    // vec4 map = texture2D(uDisplacement, vTextureCoord);
    // vec2 scale = vec2(0.2, 0.2);
    // map -= 0.5;
    // map.wz *= scale;
    float ints = brightness;
    float r = sqrt( dot(p,p) ) * (zoom);
    float a = atan(p.y,p.x) + 0.75*sin(0.5 / r + time) * (0.7 + 0.6) - 1.75*cos(0.25 / r + time / 1.7) * (0.9 + 0.2);
    float h = (0.5 + 0.5*cos(6.0*a));
    float s = smoothstep(2.8,0.2,h);
    uv.x = time * 2.0 - ints * 0.25 + 1.0/( r + .1*s);
    uv.y = iterations*a/3.1416;
    //map.x *= 0.1;
    //map.y *= 0.1;
    // uv.x += vTextureCoord.x + map.z;
    // uv.y += vTextureCoord.y + map.w;
    vec3 col = texture2D(uSampler,uv).xyz;
    col *= 1.0 + 0.4 * ints;
    float ao = smoothstep(0.0,0.3,h)-smoothstep(0.5,1.0,h);
    col *= twirl-0.6*ao*r;
    // col = col / r +  .05 / r / r;
    col = (col * 0.8) / (1.8 * r);
    gl_FragColor = vec4(col,1.0);

    // gl_FragColor = texture2D(uSampler, vec2(vTextureCoord.x + map.x, vTextureCoord.y + map.y));
}
