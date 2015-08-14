import AppStore from 'AppStore'
import AppConstants from 'AppConstants'
const glslify = require('glslify')

export default class ExplosionEffect {
	constructor(config) {
		this.config = config
		this.sprite = this.config.sprite
		this.spriteScale = 0
	}
	componentDidMount() {
		var explosionFrag = glslify(__dirname + '/shaders/explosion.glsl')
		var texture = this.sprite.texture
		this.sprite.shader = new PIXI.AbstractFilter(null, explosionFrag, this.uniforms = {
	        uOverlay: { type: 'sampler2D', value: texture },
	        uTime: { type: '1f', value: 0 },
	        uWave: { type: '1f', value: 0 },
	        uShake: { type: '1f', value: 0 },
	        uAnimation: { type: '1f', value: 0 },
	        uScreenEffect: { type: '1f', value: 0 }
	    });
	}
	update() {
		var windowW = AppStore.Window.w
		var windowH = AppStore.Window.h
		this.uniforms.uAnimation.value = this.config.animation;
	    this.uniforms.uScreenEffect.value = this.config.screenEffect + this.config.hoverAnimation * 0.3;
	    var time = this.uniforms.uTime.value += 0.001;
	    var shake = this.uniforms.uShake.value = this.config.shake;
	    this.uniforms.uWave.value = this.config.wave;

	    var spriteOffsetX = this.sprite.position.x = windowW / 2 + 0;
	    var spriteOffsetY = this.sprite.position.y = windowH / 2 + 0;

	    var shootRatio = Math.sin(Math.pow(this.config.animation, 0.5) * Math.PI);

	    var offsetX = this.spriteScale * 320 + spriteOffsetX * 1.5 + shootRatio * Math.random() * 150 * shake;
	    var offsetY = this.spriteScale * -180 + spriteOffsetY * 1.5 - shootRatio * Math.random() * 150 * shake;
	}
	resize() {
		var windowW = AppStore.Window.w
		var windowH = AppStore.Window.h
		this.spriteScale = Math.max( windowW / AppConstants.MEDIA_GLOBAL_W, windowH / AppConstants.MEDIA_GLOBAL_H);
		// this.sprite.scale.set(this.spriteScale, this.spriteScale);
	}
}
