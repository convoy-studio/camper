import AppStore from 'AppStore'
import Utils from 'Utils'

export default class GradientText {
	constructor(pxContainer) {
		this.pxContainer = pxContainer
	}
	componentDidMount(params) {

		var dsprite = new PIXI.Sprite(PIXI.Texture.fromImage(AppStore.Preloader.getImageURL('ski-experience-displacement-map')))
		var dfilter = new PIXI.filters.DisplacementFilter(dsprite)
		this.displacement = {
			sprite: dsprite,
			filter: dfilter
		}
		this.gradientText = {
			container: AppStore.getContainer(),
			gradient: new PIXI.Sprite()
		}
		this.gradientText.gradient.blendMode = PIXI.BLEND_MODES.ADD

		this.lines = []
		this.linesContainer = AppStore.getContainer()
		this.pxContainer.addChild(this.linesContainer)

		this.gradientText.gradient.anchor.x = 0.5
		this.gradientText.gradient.anchor.y = 0.5
		this.gradientText.container.addChild(this.gradientText.gradient)
		this.container = this.gradientText.container
		this.container.addChild(dsprite)
		this.container.filters = [dfilter]

		for (var i = 0; i < 16; i++) {
			var l = PIXI.Sprite.fromImage(AppStore.Preloader.getImageURL('ski-experience-light-line'));
			l.blendMode = PIXI.BLEND_MODES.ADD
			l.scale.x = Utils.Rand(10, 40)
			l.scale.y = Utils.Rand(0.1, 1.4)
			l.alpha = Utils.Rand(0.1, 0.8)
			l.y = Utils.Rand(-100, 100)
			l.anchor.x = l.anchor.y = 0.5
			this.gradientText.container.addChild(l)
			this.lines[i] = l
		};

		this.flareA = PIXI.Sprite.fromImage(AppStore.Preloader.getImageURL('ski-experience-lens-flare'));
		this.flareB = PIXI.Sprite.fromImage(AppStore.Preloader.getImageURL('ski-experience-lens-flare'));
		this.flareA.blendMode = this.flareB.blendMode = PIXI.BLEND_MODES.ADD
		this.flareA.anchor.x = this.flareA.anchor.y = this.flareB.anchor.x = this.flareB.anchor.y = 0.5
		this.flareA.scale.x = this.flareA.scale.y = this.flareB.scale.x = this.flareB.scale.y = 4
		this.container.addChild(this.flareA)
		this.container.addChild(this.flareB)

		var style = {
		    font : 'italic '+params.fontSize+'px ' + params.fontFamily,
		    fill : '#F7EDCA',
		    stroke : '#4a1850',
		    strokeThickness : params.strokeThickness,
		    dropShadow : true,
		    dropShadowColor : '#000000',
		    dropShadowAngle : Math.PI / 6,
		    dropShadowDistance : 20,
		    wordWrap : false
		};

		this.gradientText.textfield = new PIXI.Text(AppStore.randomSentence().toUpperCase(), style)
		this.gradientText.textfield.anchor.x = 0.5
		this.gradientText.textfield.anchor.y = 0.5
		this.gradientText.container.addChild(this.gradientText.textfield)
		this.pxContainer.addChild(this.gradientText.container)

		this.gradients = [
			['#fdb0c1', '#fffb48', '#ff2cff', '#ff2a07'],
			['#ffa69d', '#f5ff20', '#3fff7d', '#7afafe', '#2460ff', '#ff2a07'],
			['#fdb0c1', '#b6937d', '#0e2e61', '#616a71'],
			['#c98e94', '#0e2e61', '#3fff7d', '#616a71', '#ff2a07'],
		]

		var canvas = document.createElement('canvas')
		var ctx = canvas.getContext("2d")
		this.gradientCanvas = {
			canvas: canvas,
			ctx: ctx
		}

		this.generateGradientText()
	}
	toggle() {
		var windowW = AppStore.Window.w
		for (var i = 0; i < this.lines.length; i++) {
			var line = this.lines[i]
			line.x = Utils.Rand(-line.width << 1, windowW + (line.width << 1))
			line.velX = 70 + Math.random() * 90
			line.velX *= (line.x < 0) ? 1 : -1
		}
		this.flareA.x = -this.flareA.width
		this.flareA.y = -Utils.Rand(10, 30)
		this.flareB.x = windowW + this.flareB.width
		this.flareB.y = Utils.Rand(10, 30)

		this.flareA.velX = 160 + Math.random() * 30
		this.flareB.velX = 160 + Math.random() * 30

		this.flareA.velX *= (this.flareA.x > 0) ? -1 : 1
		this.flareB.velX *= (this.flareB.x > 0) ? -1 : 1

		this.displacement.sprite.scale.x = 1
		this.displacement.sprite.scale.y = 1
	}
	setText() {
		this.gradientText.gradient.mask = null
		this.gradientText.gradient.texture.destroy(true)
		this.gradientText.textfield.text = AppStore.randomSentence().toUpperCase()
		this.generateGradientText()
	}
	generateGradientText() {
		var gradientPadding = 30
		var gradientW = this.gradientText.textfield.width + (gradientPadding << 1)
		var gradientH = this.gradientText.textfield.height + (gradientPadding << 1)
		var randomPaletteIndex = parseInt(Utils.Rand(0, this.gradients.length-1), 10)
		this.generateGradient(gradientW, gradientH, this.gradients[randomPaletteIndex])

		this.gradientText.texture = this.generateTextureFromCanvas()
		this.gradientText.gradient.texture = this.gradientText.texture

		this.gradientText.gradient.x = -gradientPadding
		this.gradientText.gradient.y = -gradientPadding
		this.gradientText.gradient.mask = this.gradientText.textfield

		this.width = this.gradientText.textfield.width
		this.height = this.gradientText.textfield.height
	}
	generateTextureFromCanvas() {
		return PIXI.Texture.fromCanvas(this.gradientCanvas.canvas)
	}
	generateGradient(width, height, palette) {
		var canvas = this.gradientCanvas.canvas
		var ctx = this.gradientCanvas.ctx
		ctx.clearRect(0, 0, canvas.width, canvas.height)
		canvas.width = width
		canvas.height = height
		var gradient = ctx.createLinearGradient(0, 0, 0, height)
		var paletteLen = palette.length
		for (var i = 0; i < paletteLen; i++) {
			gradient.addColorStop(i / paletteLen, palette[i])
		};
		ctx.fillStyle = gradient
		ctx.fillRect(0, 0, width, height)
	}
	position(x, y) {
		this.x = x
		this.y = y
		this.gradientText.container.x = x
		this.gradientText.container.y = y
	}
	getWidth() {
		return this.width * this.scale
	}
	getHeight() {
		return this.height * this.scale
	}
	update() {
		for (var i = 0; i < this.lines.length; i++) {
			var line = this.lines[i]
			line.x += line.velX
		}
		this.flareA.x += this.flareA.velX
		this.flareB.x += this.flareB.velX

		this.displacement.sprite.scale.x += 0.04
		this.displacement.sprite.scale.y += 0.04
	}
	resize() {
		var windowW = AppStore.Window.w
		var windowH = AppStore.Window.h

		this.scale = (windowW / 1600) * 1 
		this.gradientText.container.scale.x = this.scale
		this.gradientText.container.scale.y = this.scale
	}
	componentWillUnmount() {
		this.container.filters = null
		this.gradientText.container.removeChildren()
		AppStore.releaseContainer(this.gradientText.container)
	}
}
