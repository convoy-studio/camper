precision mediump float;

varying vec2 vTextureCoord;
varying vec4 vColor;
uniform sampler2D uSampler;
uniform sampler2D uOverlay;

uniform float uScreenEffect;
uniform float uAnimation;
uniform float alpha;
uniform float uTime;
uniform float uWave;
uniform float uShake;

#define PI 3.1415926535

float rand(vec2 co){
    return fract(sin(dot(co.xy ,vec2(12.9898,78.233))) * 43758.5453);
}

/**
 * Overlay shader by @Jam3
 * https://github.com/Jam3/glsl-blend-overlay
 **/
vec3 blendOverlay(vec3 base, vec3 blend) {
    return mix(1.0 - 2.0 * (1.0 - base) * (1.0 - blend), 2.0 * base * blend, step(base, vec3(0.5)));
}

void main(void) {

    float shootRatio = sin(pow(uAnimation, 2.1) * PI);

    vec2 gunPoint = vec2(0.5, 0.5);

    vec2 coord = vTextureCoord - gunPoint;

    coord += vec2(
        rand(vec2(0.1, uTime)),
        rand(vec2(0.2, uTime))
    ) * uShake * 0.2 * (1.0 - uAnimation) * step(0.1, uAnimation);

    float d = length(coord);
    float a = atan(coord.y, coord.x);

    float delta = sin((d + (1.0 - uAnimation)) * 30.0) * uWave * 0.05 * shootRatio;

    d += delta * 5.0;

    coord = vec2(cos(a), sin(a)) * d + gunPoint;

    vec4 diffuseColor = texture2D(uSampler, coord);
    vec4 overlayColor = texture2D(uOverlay, coord);

    // vec4 color = mix(diffuseColor, overlayColor, shootRatio);
    vec4 color = diffuseColor;

    // color.rgb = blendOverlay(color.rgb, vec3(mix(0.5, 1.0, uScreenEffect + shootRatio)));
    // color.rgb = blendOverlay(color.rgb, vec3(mix(0.5, 1.0, uScreenEffect + shootRatio)));
    // color.rgb = blendOverlay(color.rgb, vec3(0.45 + rand(vTextureCoord + vec2(0.0, uTime)) * 0.1  )) - delta * pow(1.0, 0.1 + uAnimation);

    gl_FragColor = color;
}