import BaseXP from 'BaseXP'
import Utils from 'Utils'
import AppStore from 'AppStore'
import AppConstants from 'AppConstants'
import particles from 'pixi-particles'

export default class AlaskaXP extends BaseXP {
	constructor(parentContainer, parentElement) {
		super(parentContainer, parentElement)

		this.currentRockId = 'rock-b'
		this.countClicks = 0
		this.elapsed = Date.now()
		this.isAnimate = false
		this.shoeIndex = 0
		this.isFirstTimePass = true
	}
	componentDidMount() {

		var texture = PIXI.Texture.fromVideo(AppStore.baseMediaPath() + 'image/planets/alaska/experience-assets/bg-video/alaska_L.' + AppStore.videoExtensionSupport())
		this.video = $(texture.baseTexture.source)
		this.video.attr('loop', true)
		this.videoSprite = new PIXI.Sprite(texture)
		this.pxContainer.addChild(this.videoSprite)

		this.button = $('<div class="xp-button"></div>')
		this.element.append(this.button)

		this.particleContainer = new PIXI.Container()

	 	this.twistFilter = new PIXI.filters.TwistFilter()
	 	this.twistFilter.angle = 0
		this.pxContainer.filters = [this.twistFilter]

		this.emitter = new cloudkid.Emitter(
			this.particleContainer,
			[PIXI.Texture.fromImage(AppStore.Preloader.getImageURL('alaska-experience-particle'))],
		    {
		        "alpha": {
		            "start": 0.8,
		            "end": 0.6
		        },
		        "scale": {
		            "start": 0.0,
		            "end": 0.15
		        },
		        "color": {
		            "start": "56609b",
		            "end": "aeeefd"
		        },
		        "speed": {
		            "start": 100,
		            "end": 300
		        },
		        "startRotation": {
		            "min": 90,
		            "max": 90
		        },
		        "rotationSpeed": {
		            "min": 20,
		            "max": 300
		        },
		        "lifetime": {
		            "min": 2,
		            "max": 2
		        },
		        "frequency": 0.006,
		        "maxParticles": 600,
		        "emitter-lifetime": -1,
		        "pos": {
		            "x": 0,
		            "y": 0
		        },
		        "addAtBack": false,
		        "spawnType": "circle",
		        "blendMode": "screen",
		        "spawnCircle": {
		            "x": 0,
		            "y": 0,
		            "r": 200
		        }
		    }
		)

		this.rocks = {
			'rock-a': {
				'front': new PIXI.Sprite(PIXI.Texture.fromImage(AppStore.Preloader.getImageURL('alaska-experience-rock-0-0'))),
				// 'front-normal': PIXI.Texture.fromImage(AppStore.Preloader.getImageURL('alaska-experience-rock-0-0-normal_NRM')),
				'back': new PIXI.Sprite(PIXI.Texture.fromImage(AppStore.Preloader.getImageURL('alaska-experience-rock-0-1'))),
				// 'back-normal': PIXI.Texture.fromImage(AppStore.Preloader.getImageURL('alaska-experience-rock-0-1-normal_NRM')),
				'holder': AppStore.getContainer(),
				'wrapperFront': AppStore.getContainer(),
				'wrapperBack': AppStore.getContainer(),
				'wrapperShoe': AppStore.getContainer(),
				'normalWrapperFront': AppStore.getContainer(),
				'normalWrapperBack': AppStore.getContainer(),
				'width': 677,
				'height': 1056,
				'paddingX': 30,
				'paddingY': 40,
				'offsetX': -20,
				'offsetY': -40,
				'anim': {
					time: 0,
					spring: 0.2,
					friction: 0.9,
					springLength: 0,
				}
			},
			'rock-b': {
				'front': new PIXI.Sprite(PIXI.Texture.fromImage(AppStore.Preloader.getImageURL('alaska-experience-rock-1-0'))),
				// 'front-normal': PIXI.Texture.fromImage(AppStore.Preloader.getImageURL('alaska-experience-rock-1-0-normal_NRM')),
				'back': new PIXI.Sprite(PIXI.Texture.fromImage(AppStore.Preloader.getImageURL('alaska-experience-rock-1-1'))),
				// 'back-normal': PIXI.Texture.fromImage(AppStore.Preloader.getImageURL('alaska-experience-rock-1-1-normal_NRM')),
				'holder': AppStore.getContainer(),
				'wrapperFront': AppStore.getContainer(),
				'wrapperBack': AppStore.getContainer(),
				'wrapperShoe': AppStore.getContainer(),
				'normalWrapperFront': AppStore.getContainer(),
				'normalWrapperBack': AppStore.getContainer(),
				'width': 980,
				'height': 825,
				'paddingX': 50,
				'paddingY': 10,
				'offsetX': 0,
				'offsetY': 0,
				'anim': {
					time: 0,
					spring: 0.2,
					friction: 0.9,
					springLength: 0,
				}
			}
		}

		// this.rocks['rock-a'].frontNormalFilter = new PIXI.filters.NormalMapFilter(this.rocks['rock-a']['front-normal'])
		// this.rocks['rock-a'].backNormalFilter = new PIXI.filters.NormalMapFilter(this.rocks['rock-a']['back-normal'])
		// this.rocks['rock-b'].frontNormalFilter = new PIXI.filters.NormalMapFilter(this.rocks['rock-b']['front-normal'])
		// this.rocks['rock-b'].backNormalFilter = new PIXI.filters.NormalMapFilter(this.rocks['rock-b']['back-normal'])

		// var gui = new dat.GUI();
		// var that = this
		// var DebugTxt = function() {
		// 	this.offsetX = that.rocks['rock-a'].frontNormalFilter.offset.x
		// 	this.offsetY = that.rocks['rock-a'].frontNormalFilter.offset.y
		// };

		// var text = new DebugTxt();
		// $(gui.domElement).parent().css('z-index', 9999)

		// gui.add(text, 'offsetX', 0, 500).onChange(function(value) {
		// 	that.currentRock.frontNormalFilter.scale.x = value
		// });


		// this.rocks['rock-a'].normalWrapperFront.filters = [this.rocks['rock-a'].frontNormalFilter]
		// this.rocks['rock-a'].normalWrapperBack.filters = [this.rocks['rock-a'].backNormalFilter]
		// this.rocks['rock-b'].normalWrapperFront.filters = [this.rocks['rock-b'].frontNormalFilter]
		// this.rocks['rock-b'].normalWrapperBack.filters = [this.rocks['rock-b'].backNormalFilter]

		// console.log(this.rocks['rock-a'].front, this.rocks['rock-a'].back)

		this.shoes = [
			new PIXI.Sprite(PIXI.Texture.fromImage(AppStore.Preloader.getImageURL('alaska-experience-shoe-0'))),
			new PIXI.Sprite(PIXI.Texture.fromImage(AppStore.Preloader.getImageURL('alaska-experience-shoe-1'))),
			new PIXI.Sprite(PIXI.Texture.fromImage(AppStore.Preloader.getImageURL('alaska-experience-shoe-2'))),
			new PIXI.Sprite(PIXI.Texture.fromImage(AppStore.Preloader.getImageURL('alaska-experience-shoe-3')))
		]

		this.emitter.emit = true

		this.addToStage('rock-a')
		this.addToStage('rock-b')
		this.switchRock()
		
		this.pxContainer.addChild(this.particleContainer)

		this.onClick = this.onClick.bind(this)
		this.button.on('click', this.onClick)

		super.componentDidMount()
	}
	onClick(e) {
		e.preventDefault()
		if(this.isAnimate) return
		this.toggleRock()
	}
	toggleRock() {
		this.currentRock.wrapperBack.x = Utils.Rand(-20, 20)
		this.currentRock.wrapperFront.x = Utils.Rand(-20, 20)
		this.currentRock.wrapperBack.y = Utils.Rand(-5, 5)
		this.currentRock.wrapperFront.y = Utils.Rand(-5, 5)

		this.countClicks += 1
		this.particleContainer.alpha = 0.7
		clearTimeout(this.counterTimeout)
		this.counterTimeout = setTimeout(()=>{
			this.countClicks = 0
		}, 600)
		if(this.countClicks > 3) {
			this.switchRock()
			this.countClicks = 0
		}
	}
	switchRock() {
		this.currentRockId = (this.currentRockId === 'rock-a') ? 'rock-b' : 'rock-a'
		this.previousRock = (this.currentRock == undefined) ? this.rocks['rock-b'] : this.currentRock
		this.currentRock = this.rocks[this.currentRockId]

		this.shoeIndex += 1
		this.shoeIndex = (this.shoeIndex > this.shoes.length-1) ? 0 : this.shoeIndex
		this.shoeIndex = (this.shoeIndex < 0) ? this.shoes.length-1 : this.shoeIndex
		this.previousShoe = (this.currentShoe == undefined) ? this.shoes[0] : this.currentShoe
		this.currentShoe = this.shoes[this.shoeIndex]
		this.previousShoe.anchor.x = 0.5
		this.previousShoe.anchor.y = 0.5
		this.currentShoe.anchor.x = 0.5
		this.currentShoe.anchor.y = 0.5

		this.currentRock.wrapperShoe.addChild(this.currentShoe)

		this.resetAnimValues()
	}
	resetAnimValues() {
		var windowW = AppStore.Window.w
		var windowH = AppStore.Window.h
		this.currentRock.holder.x = (windowW >> 1)
		this.currentRock.holder.y = -this.currentRock.height * 0.8
		this.currentRock.anim.toY = (windowH >> 1)
		this.previousRock.holder.x = (windowW >> 1)
		this.previousRock.anim.toY = windowH * 2
		if(this.isFirstTimePass) {
			this.previousRock.holder.y = windowH * 2
			this.isFirstTimePass = false
		}

		this.currentShoe.scale.x = 0.8
		this.currentShoe.scale.y = 0.8

		this.currentRock.wrapperBack.rotation = 0
		this.currentRock.wrapperFront.rotation = 0
		this.isAnimate = true

		this.currentRock.wrapperShoe.scale.x = 0
		this.currentRock.wrapperShoe.scale.y = 0
		this.previousRock.wrapperShoe.rotation = Utils.Rand(-2.8, -1.8)

		this.twistFilter.angle = 2

		setTimeout(()=>{
			TweenMax.to(this.currentRock.holder, 1, { y:this.currentRock.anim.toY, ease:Elastic.easeOut })
			TweenMax.fromTo(this.currentRock.holder.scale, 2, { x:-0.1, y:0 }, { x:1, y:1, ease:Elastic.easeOut })
			this.isAnimate = false
			this.previousRock.wrapperShoe.removeChildren()
		}, 2000)			

		TweenMax.to(this.previousRock.wrapperBack, 2, { x:Utils.Rand(-240, -100), rotation:Utils.Rand(-.7, -.2), ease:Elastic.easeOut })
		TweenMax.to(this.previousRock.wrapperFront, 2, { x:Utils.Rand(240, 300), y:Utils.Rand(160, 240), rotation:Utils.Rand(.2, .4), ease:Elastic.easeOut })

		TweenMax.to(this.previousRock.wrapperShoe.scale, 1, { x:1.4, y:1.4, ease:Elastic.easeOut })
		TweenMax.to(this.previousRock.wrapperShoe, 1, { rotation:0, ease:Elastic.easeOut })

		var randIndex = Utils.Rand(0, 2, 0)
		var soundId = 'alaska-sounds-rock-open-' + randIndex
		AppStore.Sounds.play(soundId)

		setTimeout(()=>{
			TweenMax.to(this.previousRock.holder, 1, { y:this.previousRock.anim.toY, ease:Expo.easeInOut })
			TweenMax.fromTo(this.previousRock.holder.scale, 1, { x:1, y:1 }, { x:0.8, y:0.8, ease:Expo.easeInOut })
			
			var randIndex = Utils.Rand(0, 1, 0)
			var soundId = 'alaska-sounds-rock-in-' + randIndex
			AppStore.Sounds.play(soundId)

		}, 800)

		this.particleContainer.alpha = 1
	}
	addToStage(rockId) {
		var rock = this.rocks[rockId]
		var scale = 0.5
		this.pxContainer.addChild(rock.holder)
		rock.holder.addChildAt(rock.wrapperBack, 0)
		rock.holder.addChildAt(rock.wrapperShoe, 1)
		rock.holder.addChildAt(rock.wrapperFront, 2)

		rock.wrapperBack.addChild(rock.normalWrapperBack)
		rock.wrapperFront.addChild(rock.normalWrapperFront)
		rock.normalWrapperBack.addChild(rock.back)
		rock.normalWrapperFront.addChild(rock.front)

		rock.back.anchor.x = 0.5
		rock.back.anchor.y = 0.5
		rock.front.anchor.x = 0.5
		rock.front.anchor.y = 0.5
		rock.normalWrapperBack.pivot.x = 0.5
		rock.normalWrapperBack.pivot.y = 0.5
		rock.normalWrapperBack.scale.x = scale
		rock.normalWrapperBack.scale.y = scale
		rock.normalWrapperFront.pivot.x = 0.5
		rock.normalWrapperFront.pivot.y = 0.5
		rock.normalWrapperFront.scale.x = scale
		rock.normalWrapperFront.scale.y = scale
		rock.holder.pivot.x = 0.5
		rock.holder.pivot.y = 0.5
		rock.normalWrapperFront.x = (rock.paddingX) + (rock.offsetX)
		rock.normalWrapperFront.y = (rock.paddingY) + (rock.offsetY)
		rock.normalWrapperBack.x = -(rock.paddingX) + (rock.offsetX)
		rock.normalWrapperBack.y = -(rock.paddingY) + (rock.offsetY)
		rock.width *= scale
		rock.height *= scale
		rock.wrapperFront.toX = 0
		rock.wrapperFront.toY = 0
		rock.wrapperFront.vx = 0
		rock.wrapperFront.vy = 0
		rock.wrapperBack.toX = 0
		rock.wrapperBack.toY = 0
		rock.wrapperBack.vx = 0
		rock.wrapperBack.vy = 0
	}
	update() {
		super.update()

		var now = Date.now()
		this.emitter.update((now - this.elapsed) * 0.001)
    	this.elapsed = now

    	this.particleContainer.alpha -= (this.particleContainer.alpha + 0.0001) * 0.01
    	this.twistFilter.angle -= (this.twistFilter.angle + 0.001) * 0.1

		this.currentRock.anim.time += 0.04
		this.currentRock.normalWrapperBack.x = -(this.currentRock.paddingX) + (this.currentRock.offsetX) + Math.cos(this.currentRock.anim.time) * 5
		this.currentRock.normalWrapperBack.y = -(this.currentRock.paddingX) + (this.currentRock.offsetX) + Math.sin(this.currentRock.anim.time) * 22
		this.currentRock.normalWrapperFront.x = (this.currentRock.paddingX) + (this.currentRock.offsetX) + Math.cos(this.currentRock.anim.time) * 4
		this.currentRock.normalWrapperFront.y = (this.currentRock.paddingX) + (this.currentRock.offsetX) + Math.sin(this.currentRock.anim.time) * 22
		this.currentRock.normalWrapperBack.rotation = Math.sin(this.currentRock.anim.time) * 0.02
		this.currentRock.normalWrapperFront.rotation = Math.cos(this.currentRock.anim.time) * 0.02

		this.currentShoe.rotation = Math.cos(this.currentRock.anim.time*0.8) * 0.1

		Utils.SpringTo(this.currentRock.wrapperBack, this.currentRock.wrapperBack.toX, this.currentRock.wrapperBack.toY, 1, this.currentRock.anim.spring, this.currentRock.anim.friction, this.currentRock.anim.springLength)
		Utils.SpringTo(this.currentRock.wrapperFront, this.currentRock.wrapperFront.toX, this.currentRock.wrapperFront.toY, 1, this.currentRock.anim.spring, this.currentRock.anim.friction, this.currentRock.anim.springLength)
		this.currentRock.wrapperBack.x += this.currentRock.wrapperBack.vx 
		this.currentRock.wrapperFront.x += this.currentRock.wrapperFront.vx
		this.currentRock.wrapperBack.y += this.currentRock.wrapperBack.vy
		this.currentRock.wrapperFront.y += this.currentRock.wrapperFront.vy
	}
	resize() {
		var windowW = AppStore.Window.w
		var windowH = AppStore.Window.h
		var videoResize = Utils.ResizePositionProportionally(windowW, windowH, AppConstants.MEDIA_GLOBAL_W, AppConstants.MEDIA_GLOBAL_H)

		this.videoSprite.x = videoResize.left
		this.videoSprite.y = videoResize.top
		this.videoSprite.width = videoResize.width
		this.videoSprite.height = videoResize.height

		this.particleContainer.x = (windowW >> 1)
		this.particleContainer.y = (windowH >> 1)

		this.currentRock.anim.toY = (windowH >> 1)
		this.currentRock.holder.x = (windowW >> 1)
		this.currentRock.holder.y = (windowH >> 1)

		var buttonW = windowW * 0.4
		var buttonH = windowH * 0.6
		this.button.css({
			width: buttonW,
			height: buttonH,
			left: (windowW >> 1) - (buttonW >> 1),
			top: (windowH >> 1) - (buttonH >> 1)
		})

		super.resize()
	}
	removeFromRockById(id) {
		this.rocks[id].holder.removeChildren()
		this.rocks[id].wrapperFront.removeChildren()
		this.rocks[id].wrapperBack.removeChildren()
		this.rocks[id].wrapperShoe.removeChildren()
		this.rocks[id].normalWrapperFront.removeChildren()
		this.rocks[id].normalWrapperBack.removeChildren()
		AppStore.releaseContainer(this.rocks[id].holder)
		AppStore.releaseContainer(this.rocks[id].wrapperFront)
		AppStore.releaseContainer(this.rocks[id].wrapperBack)
		AppStore.releaseContainer(this.rocks[id].wrapperShoe)
		AppStore.releaseContainer(this.rocks[id].normalWrapperFront)
		AppStore.releaseContainer(this.rocks[id].normalWrapperBack)
	}
	componentWillUnmount() {
		this.pxContainer.filters = null
		this.removeFromRockById('rock-a')
		this.removeFromRockById('rock-b')
		this.button.off('click', this.onClick)
		this.emitter.destroy()
		super.componentWillUnmount()
	}
}

