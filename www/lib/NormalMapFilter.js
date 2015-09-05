/**
 * @author Mat Groves http://matgroves.com/ @Doormat23
 */


/**
 * 
 * The NormalMapFilter class uses the pixel values from the specified texture (called the displacement map) to perform a displacement of an object. 
 * You can use this filter to apply all manor of crazy warping effects
 * Currently the r property of the texture is used offset the x and the g propery of the texture is used to offset the y.
 * @class NormalMapFilter
 * @contructor
 * @param texture {Texture} The texture used for the displacemtent map * must be power of 2 texture at the moment
 */
PIXI.NormalMapFilter = function(texture)
{
	PIXI.AbstractFilter.call( this );
	
	this.passes = [this];
	//texture.baseTexture._powerOf2 = true;
	this.fragmentSrc = [
		
		"precision mediump float;",

		"varying vec2 vTextureCoord;",
		"varying vec4 vColor;",

		"uniform sampler2D displacementMap;",
		"uniform sampler2D uSampler;",

		"uniform vec4 dimensions;",

		"const vec2 Resolution = vec2(1.0,1.0);",
		"uniform vec3 LightPos;",
		"const vec4 LightColor = vec4(1.0, 1.0, 1.0, 1.0);",
		"const vec4 AmbientColor = vec4(1.0, 1.0, 1.0, 0.5);",
		"const vec3 Falloff = vec3(0.0, 1.0, 0.2);",

		"uniform vec3 LightDir;",

		"uniform vec2 mapDimensions;",


		"void main(void)",
		"{",
		    "vec2 mapCords = vTextureCoord.xy;",

		    "vec4 color = texture2D(uSampler, vTextureCoord.st);",
		    "vec3 nColor = texture2D(displacementMap, vTextureCoord.st).rgb;",


		    "mapCords *= vec2(dimensions.x/512.0, dimensions.y/512.0);",
		    "mapCords.y *= -1.0;",
		    "mapCords.y += 1.0;",

		    "vec4 DiffuseColor = texture2D(uSampler, vTextureCoord);",

		    "vec3 NormalMap = texture2D(displacementMap, mapCords).rgb;",

		    "// vec3 LightDir = vec3(LightPos.xy - (gl_FragCoord.xy / Resolution.xy), LightPos.z);",
		    "vec3 LightDir = vec3(LightPos.xy - (mapCords.xy), LightPos.z);",

		    "// LightDir.x *= Resolution.x / Resolution.y;",

		    "float D = length(LightDir);",

		    "vec3 N = normalize(NormalMap * 2.0 - 1.0);",
		    "vec3 L = normalize(LightDir);",

		    "vec3 Diffuse = (LightColor.rgb * LightColor.a) * max(dot(N, L), 0.0);",

		    "vec3 Ambient = AmbientColor.rgb * AmbientColor.a;",

		    "float Attenuation = 1.0 / ( Falloff.x + (Falloff.y*D) + (Falloff.z*D*D) );",

		    "vec3 Intensity = Ambient + Diffuse * Attenuation;",
		    "vec3 FinalColor = DiffuseColor.rgb * Intensity;",
		    "gl_FragColor = vColor * vec4(FinalColor, DiffuseColor.a);",

		    "// gl_FragColor = vec4(1.0, 0.0, 0.0, Attenuation);",

		"}"

	];

	// console.log(this.fragmentSrc.join(" "))

	PIXI.AbstractFilter.call(this,
        // vertex shader
        null,
        // fragment shader
        this.fragmentSrc.join(" "),
        // custom uniforms
        {
            displacementMap:  { type: 'sampler2D', value: texture },
            scale:            { type: '2f', value: { x: 15, y: 15 } },
            offset:           { type: '2f', value: { x: 0,  y: 0 } },
            mapDimensions:    { type: '2f', value: { x: 1,  y: 1 } },
            dimensions:       { type: '4f', value: [0, 0, 0, 0] },
            // LightDir:         { type: 'f3', value: [0, 1, 0] },
            LightPos:         { type: '3f', value: [0, 1, 0] }
        }
    );

	texture.baseTexture._powerOf2 = true;

    if (texture.baseTexture.hasLoaded)
    {
        this.onTextureLoaded();
    }
    else
    {
        texture.baseTexture.once('loaded', this.onTextureLoaded, this);
    }

	
}

PIXI.NormalMapFilter.prototype = Object.create( PIXI.AbstractFilter.prototype );
PIXI.NormalMapFilter.prototype.constructor = PIXI.NormalMapFilter;

PIXI.NormalMapFilter.prototype.onTextureLoaded = function()
{
	
	this.uniforms.mapDimensions.value.x = this.uniforms.displacementMap.value.width;
    this.uniforms.mapDimensions.value.y = this.uniforms.displacementMap.value.height;

}
