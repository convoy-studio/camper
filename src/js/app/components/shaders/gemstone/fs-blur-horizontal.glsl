#ifdef GL_ES
precision highp float;
#endif
// original shader from http://www.gamerendering.com/2008/10/11/gaussian-blur-filter-shader/
// horizontal blur fragment shader
uniform sampler2D src_tex;
varying vec2 pixel;
uniform vec2 pixelSize;
void main(void) // fragment
{
    float h = pixelSize.x;
    vec4 sum = vec4(0.0);
    sum += texture2D(src_tex, vec2(pixel.x - 4.0*h, pixel.y) ) * 0.05;
    sum += texture2D(src_tex, vec2(pixel.x - 3.0*h, pixel.y) ) * 0.09;
    sum += texture2D(src_tex, vec2(pixel.x - 2.0*h, pixel.y) ) * 0.12;
    sum += texture2D(src_tex, vec2(pixel.x - 1.0*h, pixel.y) ) * 0.15;
    sum += texture2D(src_tex, vec2(pixel.x + 0.0*h, pixel.y) ) * 0.16;
    sum += texture2D(src_tex, vec2(pixel.x + 1.0*h, pixel.y) ) * 0.15;
    sum += texture2D(src_tex, vec2(pixel.x + 2.0*h, pixel.y) ) * 0.12;
    sum += texture2D(src_tex, vec2(pixel.x + 3.0*h, pixel.y) ) * 0.09;
    sum += texture2D(src_tex, vec2(pixel.x + 4.0*h, pixel.y) ) * 0.05;
    gl_FragColor.xyz = sum.xyz/0.98; // normalize
    gl_FragColor.a = 1.;
} 