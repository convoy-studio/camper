precision mediump float;

varying vec2 vTextureCoord;
uniform vec2 resolution;
uniform sampler2D uSampler;
uniform float time;
uniform float rotation;
uniform float displace;
uniform float intensity;
uniform float zoom;
uniform float octave;
uniform vec2 offset;
uniform sampler2D mask;


// float hash21(in vec2 n){ return fract(sin(dot(n, vec2(12.9898, 4.1414))) * 43758.5453); }
float hash21(in vec2 n){ return fract(sin(dot(n, offset)) * 43758.5453); }
mat2 makem2(in float theta){float c = cos(theta);float s = sin(theta);return mat2(c,-s,s,c);}
float noise( in vec2 x ){return texture2D(uSampler, x*.01).x;}

vec2 gradn(vec2 p) {
    float ep = .09;
    float gradx = noise(vec2(p.x+ep,p.y))-noise(vec2(p.x-ep,p.y));
    float grady = noise(vec2(p.x,p.y+ep))-noise(vec2(p.x,p.y-ep));
    return vec2(gradx,grady);
}

float flow(in vec2 p)
{
    float z = zoom;
    float rz = 0.;
    vec2 bp = p;
    for (float i= 1.0; i < 6.0; i++) {
        //primary flow speed
        p += time*.6;
        //secondary flow speed (speed of the perceived flow)
        bp += time*1.9;
        //displacement field (try changing time multiplier)
        vec2 gr = gradn(i*p*.34+time*1.);
        //rotation of the displacement field
        gr*=makem2(time*rotation-(0.05*p.x+0.03*p.y)*40.);
        //displace the system
        p += gr*displace;
        //add noise octave
        rz+= (sin(noise(p)*7.)*0.5+0.5)/z;
        //blend factor (blending displaced system with base system)
        //you could call this advection factor (.5 being low, .95 being high)
        p = mix(bp,p,octave);
        //intensity scaling
        z *= intensity;
        //octave scaling
        p *= 2.;
        bp *= .09;
    }
    return rz;  
}

void main(void) {
    vec2 p = -1.0 + 2.0 * vTextureCoord.xy;
    float rz = flow(p);
    vec3 col = vec3(.2,0.07,0.01)/rz;
    col = pow(col,vec3(1.4));

    vec4 original = vec4(col, 1.0);

    vec4 masky = texture2D(mask, vTextureCoord);
    float alpha = 1.0;
    original *= (masky.r * masky.a * alpha);

    gl_FragColor = vec4(original);
}

