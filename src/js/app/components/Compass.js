import AppStore from 'AppStore'
import AppConstants from 'AppConstants'
import ExplosionEffect from 'ExplosionEffect'
import SpringGarden from 'SpringGarden'
import CompassRings from 'CompassRings'

export default class Compass {
	constructor(pxContainer) {
		this.pxContainer = pxContainer
	}
	componentDidMount() {

		this.container = new PIXI.Container()
		this.pxContainer.addChild(this.container)

		var imgUrl = 'image/compass.png'
 		var texture = PIXI.Texture.fromImage(imgUrl)
 		this.sprite = new PIXI.Sprite(texture)
 		this.spriteSize = [997, 1019]
 		this.sprite.originalW = this.spriteSize[0]
 		this.sprite.originalH = this.spriteSize[1]
 		// this.sprite.anchor.set(0.5, 0.5)
 		// this.container.addChild(this.sprite)
 		var scale = 0.5
 		this.sprite.width = this.sprite.originalW * scale
 		this.sprite.height = this.sprite.originalH * scale

 		this.springGarden = new SpringGarden(this.container)
 		this.springGarden.componentDidMount()

 		this.rings = new CompassRings(this.container)
 		this.rings.componentDidMount()

 	// 	this.explosionConfig = {
		//     animation: 0,
		//     wave: 0.1,
		//     shake: 0.0,
		//     screenEffect: 0.4,
		//     sprite: this.sprite,
		//     shoot: ()=> {
		//         TweenMax.fromTo(this.explosionConfig, 4, {animation: 0}, {animation: 1, ease:Expo.easeOut});
		//     },
		//     hoverAnimation: 0
		// }
 	// 	this.explosionEffect = new ExplosionEffect(this.explosionConfig)
 	// 	this.explosionEffect.componentDidMount()

	    // setInterval(()=>{
	    // 	this.explosionConfig.shoot()
	    // }, 4000)
	}
	update() {
		// this.explosionEffect.update()
		this.springGarden.update()
	}
	resize() {
		var windowW = AppStore.Window.w
		var windowH = AppStore.Window.h
		var sizePercentage = 0.3
		// var radius = (AppStore.Orientation == AppConstants.LANDSCAPE) ? (windowW * sizePercentage) : (windowH * sizePercentage)
		// this.explosionEffect.resize()
		
		var radius = windowH * sizePercentage
		this.springGarden.resize(radius)
		this.rings.resize(radius)

		this.container.x = (windowW >> 1)
		this.container.y = (windowH >> 1)

		// this.sprite.x = (windowW >> 1) - (this.sprite.width >> 1)
		// this.sprite.y = (windowH >> 1) - (this.sprite.height >> 1)
		// this.sprite.x = (windowW >> 1)
		// this.sprite.y = (windowH >> 1)
	}
}
