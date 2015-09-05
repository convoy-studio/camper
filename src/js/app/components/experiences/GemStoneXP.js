import BaseXP from 'BaseXP'
import AppStore from 'AppStore'
const glslify = require('glslify')

export default class GemStoneXP extends BaseXP {
	constructor(parentContainer, parentElement) {
		super(parentContainer, parentElement)
	}
	componentDidMount() {
		super.componentDidMount()

		var explosionFrag = glslify('../shaders/gemstone/diffusion-mix-frag.glsl')

		// var imgUrl = AppStore.Preloader.getImageURL('gemstone-experience-noise-color')
		// var texture = PIXI.Texture.fromImage(imgUrl)
		// this.sprite = new PIXI.Sprite(texture)
		// this.sprite.shader = new PIXI.AbstractFilter(null, explosionFrag, this.uniforms = {
		// 	resolution: { type: '2f', value: { x: 0, y: 0 } },
		// 	uNoise: {type: 'sampler2D', value: texture},
		// 	time: {type: '1f', value: 0},
	 //    })

	 //    this.pxContainer.addChild(this.sprite)

		// console.log(explosionFrag)
	}
	update() {
		super.update()
		// this.uniforms.time.value += 0.1
	}
	resize() {
		// var windowW = AppStore.Window.w
		// var windowH = AppStore.Window.h
		// this.sprite.width = windowW
		// this.sprite.height = windowH
		// this.uniforms.resolution.value.x = windowW
		// this.uniforms.resolution.value.y = windowH
		super.resize()
	}
	componentWillUnmount() {
		super.componentWillUnmount()
	}
}
