import BaseXP from 'BaseXP'
import AppStore from 'AppStore'
import Utils from 'Utils'
import particles from 'pixi-particles'
import Sounds from 'Sounds'

export default class WoodXP extends BaseXP {
	constructor(parentContainer, parentElement) {
		super(parentContainer, parentElement)
	}
	componentDidMount() {

		this.counter = 0
		this.owl = {
			time: Utils.Rand(100, 300),
			counter: 0
		}

		this.notes = {
			len: 8,
			btns: []
		}

		this.displacementMapTexture = new PIXI.Sprite(PIXI.Texture.fromImage(AppStore.Preloader.getImageURL('wood-experience-displacement')))
		this.displacementMapTexture.anchor.x = this.displacementMapTexture.anchor.y = 0.5
		this.displacementFilter = new PIXI.filters.DisplacementFilter(this.displacementMapTexture)
		this.displacementMapTexture.scale.x = this.displacementMapTexture.scale.y = 0
		this.displacementTween = TweenMax.fromTo(this.displacementMapTexture.scale, 2, { x:0, y:0 }, { x:20, y:20, ease:Expo.easeOut })

		this.onMouseEnter = this.onMouseEnter.bind(this)

		var notes = 0
		for (var i = 0; i < this.notes.len; i++) {
			var btn = $('<div id="'+'note-'+notes+'" class="xp-button"></div>')
			this.element.append(btn)
			btn.on('mouseenter', this.onMouseEnter)
			this.notes.btns.push(btn)
			notes += 1
		};

		notes = this.notes.len
		for (var i = this.notes.len; i < this.notes.len*2; i++) {
			var btn = $('<div id="'+'note-'+notes+'" class="xp-button"></div>')
			this.element.append(btn)
			btn.on('mouseenter', this.onMouseEnter)
			this.notes.btns.push(btn)
			notes -= 1
		};

		this.elapsed = Date.now()

		this.circles = {
			container: AppStore.getContainer(),
			parts: [],
		}
		this.pxContainer.addChild(this.circles.container)

		AppStore.Sounds.play('wood-sounds-rain', { interrupt: createjs.Sound.INTERRUPT_ANY, loop:-1 })

		this.particleContainer = AppStore.getContainer()
		this.emitter = new cloudkid.Emitter(
		  	this.particleContainer,
		  	[
				PIXI.Texture.fromImage(AppStore.Preloader.getImageURL('wood-experience-rain'))
		  	],	
		  	{
		    	"alpha": {
					"start": 0.4,
					"end": 0.4
				},
				"scale": {
					"start": 1,
					"end": 1
				},
				"color": {
					"start": "ffffff",
					"end": "ffffff"
				},
				"speed": {
					"start": 3000,
					"end": 3000
				},
				"startRotation": {
					"min": 90,
					"max": 90
				},
				"rotationSpeed": {
					"min": 0,
					"max": 0
				},
				"lifetime": {
					"min": 0.81,
					"max": 0.81
				},
				"blendMode": "normal",
				"frequency": 0.002,
				"emitterLifetime": 0,
				"maxParticles": 400,
				"pos": {
					"x": 0,
					"y": -400
				},
				"addAtBack": false,
				"spawnType": "rect",
				"spawnRect": {
					"x": 0,
					"y": 0,
					"w": 900,
					"h": 20
				}
		    }
		)

		this.emitter.emit = true

		var totalScale = 0.9
		this.totalSteps = 15
		var scaleStep = totalScale / this.totalSteps
		var currentScale = totalScale
		for (var i = 0; i < this.totalSteps; i++) {
			var part = new PIXI.Sprite(PIXI.Texture.fromImage(AppStore.Preloader.getImageURL('wood-experience-wood-part')))
			part.anchor.x = part.anchor.y = 0.5
			part.rotation = Utils.Rand(-.1, .1)
			
			part.scale.x = part.scale.y = currentScale
			currentScale -= scaleStep

			var filter = new PIXI.filters.ColorMatrixFilter()
			part.filters = [filter]
			var brightness = Utils.Rand(0.7, 1)
			filter.brightness(brightness)

			this.circles.container.addChild(part)
			this.circles.parts[i] = part
		};

		this.pxContainer.addChild(this.displacementMapTexture)
		this.circles.container.filters = [this.displacementFilter]
		this.pxContainer.addChild(this.particleContainer)

		super.componentDidMount()
	}
	onMouseEnter(e) {
		e.preventDefault()
		var target = e.currentTarget
		var id = target.id
		var noteNum = id.replace('note-', '')
		var soundId = 'wood-sounds-woodblock-' + noteNum
		AppStore.Sounds.play(soundId)
		this.displacementTween.play(0)
	}
	update() {
		this.counter += 0.3

		var windowW = AppStore.Window.w
		var windowH = AppStore.Window.h
		var mouse = AppStore.Mouse

		var normalX = (mouse.x / windowW) * 1
		var normalY = (mouse.y / windowH) * 1
		var offsetNormalX = normalX - 0.5
		var offsetNormalY = normalY - 0.5
		var middleX = (mouse.x > (windowW >> 1)) ? 0.5 - (normalX - 0.5) : normalX
		var middleY = (mouse.y > (windowH >> 1)) ? 0.5 - (normalY - 0.5) : normalY

		var parts = this.circles.parts
		for (var i = 0; i < parts.length; i++) {
			var part = parts[i]
			part.rotation = Math.sin((this.counter + i) / this.totalSteps) * 2
			part.x += offsetNormalX * (1.1*i)
			part.y += offsetNormalY * (1.1*i)
		};

		this.displacementMapTexture.x = mouse.x
		this.displacementMapTexture.y = mouse.y

		var now = Date.now()
		this.emitter.update((now - this.elapsed) * 0.001)
    	this.elapsed = now

    	this.owl.counter += 2
    	if(this.owl.counter > this.owl.time) {
    		this.owl.time = Utils.Rand(800, 2000)
    		this.owl.counter = 0
    		AppStore.Sounds.play('wood-sounds-owl')
    	}

		super.update()
	}
	resize() {
		var windowW = AppStore.Window.w
		var windowH = AppStore.Window.h
		this.circles.container.x = (windowW >> 1)
		this.circles.container.y = (windowH >> 1)

		var bounds = 1300
		var scale = (windowW > windowH) ? ((windowW / bounds) * 1) : ((windowH / (bounds * 0.8)) * 1)
		this.circles.container.scale.x = scale
		this.circles.container.scale.y = scale

		this.displacementMapTexture.x = this.circles.container.x
		this.displacementMapTexture.y = this.circles.container.y

		this.emitter.spawnRect.width = windowW
		this.emitter.spawnRect.height = windowH

		var btnW = windowW / (this.notes.len * 2)

		for (var i = 0; i < this.notes.btns.length; i++) {
			var btn = this.notes.btns[i]
			btn.css({
				left: btnW * i,
				width: btnW,
				height: windowH
			})
		};

		super.resize()
	}
	componentWillUnmount() {
		for (var i = 0; i < this.notes.btns.length; i++) {
			var btn = this.notes.btns[i]
			btn.off('mouseenter', this.onMouseEnter)
		};
		this.circles.container.filters = null
		this.circles.container.removeChildren()
		this.particleContainer.removeChildren()
		AppStore.releaseContainer(this.circles.container)
		AppStore.releaseContainer(this.particleContainer)
		this.emitter.destroy()
		super.componentWillUnmount()
	}
}

