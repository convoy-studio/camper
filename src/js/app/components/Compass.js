import AppStore from 'AppStore'
const glslify = require('glslify')

export default class Compass {
	constructor(pxContainer) {
		this.pxContainer = pxContainer
	}
	componentDidMount() {

		this.compassContainer = new PIXI.Container()
		this.pxContainer.addChild(this.compassContainer)

		var imgUrl = 'image/compass.png'
 		var texture = PIXI.Texture.fromImage(imgUrl)
 		this.sprite = new PIXI.Sprite(texture)
 		this.sprite.originalW = 673
 		this.sprite.originalH = 637
 		this.compassContainer.addChild(this.sprite)
 		var scale = 0.5
 		this.sprite.width = this.sprite.originalW * scale
 		this.sprite.height = this.sprite.originalH * scale

 		var src = glslify(__dirname + '/shaders/shader.glsl')
 		console.log(src)
	}
	update() {

	}
	resize() {
		var windowW = AppStore.Window.w
		var windowH = AppStore.Window.h
		this.sprite.x = (windowW >> 1) - (this.sprite.width >> 1)
		this.sprite.y = (windowH >> 1) - (this.sprite.height >> 1)
	}
}
