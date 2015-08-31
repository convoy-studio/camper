precision mediump float;
varying vec2 vTextureCoord;
varying vec4 vColor;
uniform sampler2D displacementMap;
uniform sampler2D uSampler;
uniform vec2 scale;
uniform vec2 offset;
uniform vec4 dimensions;
uniform vec2 mapDimensions;// = vec2(256.0, 256.0);
// const vec2 textureDimensions = vec2(750.0, 750.0);

void main(void) {
   vec2 mapCords = vTextureCoord.xy;
//   mapCords -= ;
   mapCords += (dimensions.zw + offset) / dimensions.xy ;
   mapCords.y *= -1.0;
   mapCords.y += 1.0;
   vec2 matSample = texture2D(displacementMap, mapCords).xy;
   // matSample -= 0.5;
   // matSample *= scale;
   // matSample /= mapDimensions;
   gl_FragColor = texture2D(displacementMap, mapCords);
  //  gl_FragColor.rgb = mix( gl_FragColor.rgb, gl_FragColor.rgb, 1.0);
  //  vec2 cord = vTextureCoord;

  // gl_FragColor =  texture2D(displacementMap, cord);
     // gl_FragColor = gl_FragColor;
}