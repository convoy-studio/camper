precision mediump float;

varying vec2 vTextureCoord;
uniform vec2 resolution;
uniform sampler2D uSampler;
uniform float time;
uniform float zoom;
uniform float brightness;
uniform float twirl;
uniform float iterations;

void main(void) {
    vec2 p = -1.0 + 2.0 * vTextureCoord.xy;
    vec2 uv;
    float ints = brightness;
    float r = sqrt( dot(p,p) ) * (zoom);
    float a = atan(p.y,p.x) + 0.75*sin(0.5 / r + time) * (0.7 + 0.6) - 1.75*cos(0.25 / r + time / 1.7) * (0.9 + 0.2);
    float h = (0.5 + 0.5*cos(6.0*a));
    float s = smoothstep(2.8,0.2,h);
    uv.x = time * 2.0 - ints * 0.25 + 1.0/( r + .1*s);
    uv.y = iterations*a/3.1416;
    vec3 col = texture2D(uSampler,uv).xyz;
    col *= 1.0 + 0.4 * ints;
    float ao = smoothstep(0.0,0.3,h)-smoothstep(0.5,1.0,h);
    col *= twirl-0.6*ao*r;
    col = col / r +  .05 / r / r;
    gl_FragColor = vec4(col,1.0);
}