#ifdef GL_ES
precision highp float;
#endif

uniform sampler2D sampler_prev;
uniform sampler2D sampler_prev_n;
uniform sampler2D sampler_blur;
uniform sampler2D sampler_noise;
uniform sampler2D sampler_noise_n;

varying vec2 pixel;
uniform vec2 pixelSize;
uniform vec4 rnd;
uniform vec2 mouse;
uniform float time;

void main(void) {
    vec2 zoom_in = mouse + (pixel-mouse)*0.96;
    vec4 rand_noise = texture2D(sampler_noise, zoom_in + vec2(rnd.x, rnd.y));
    zoom_in += (rand_noise.yz-0.5)*pixelSize*1.; // error-diffusion
    gl_FragColor = texture2D(sampler_prev, zoom_in) + (rand_noise-0.5)*0.12;
    gl_FragColor -= (texture2D(sampler_blur, zoom_in) - texture2D(sampler_prev, zoom_in))*0.024; // reaction-diffusion

    gl_FragColor.a = 1.;
}