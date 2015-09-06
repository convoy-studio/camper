import BaseXP from 'BaseXP'
import AppStore from 'AppStore'
import Vec2 from 'Vec2'
const glslify = require('glslify')

export default class GemStoneXP extends BaseXP {
	constructor(parentContainer, parentElement) {
		super(parentContainer, parentElement)
	}
	componentDidMount() {
		super.componentDidMount()
		this.onMouseMove = this.onMouseMove.bind(this)
		this.toggleActivationStep = this.toggleActivationStep.bind(this)
		this.mouseVec = {
			middle: new Vec2(0, 0),
			normalMiddle: new Vec2(0, 0),
			normalMouse: new Vec2(0, 0),
			radius: 0,
			normalDist: 0
		}

		this.stepsCounter = 0
		this.state = 'normal'

		this.button = $('<div class="xp-button"></div>')
		this.element.append(this.button)

		var explosionFrag = glslify('../shaders/gemstone/diffusion-mix-frag.glsl')
		var imgUrl = AppStore.Preloader.getImageURL('gemstone-experience-texture')
		var texture = PIXI.Texture.fromImage(imgUrl)
		this.sprite = new PIXI.Sprite(texture)
		this.sprite.shader = new PIXI.AbstractFilter(null, explosionFrag, this.uniforms = {
			resolution: { type: '2f', value: { x: 1, y: 1 } },
			uSampler: {type: 'sampler2D', value: texture},
			time: {type: '1f', value: 0},
			zoom: {type: '1f', value: 1.0},
			brightness: {type: '1f', value: 1.25},
			twirl: {type: '1f', value: 1.0},
			iterations: {type: '1f', value: 1.0},
	    })
	    this.pxContainer.addChild(this.sprite)
	    $('#app-container').on('mousemove', this.onMouseMove)

	    this.shoes = [
			new PIXI.Sprite(PIXI.Texture.fromImage(AppStore.Preloader.getImageURL('gemstone-experience-shoe-0'))),
			new PIXI.Sprite(PIXI.Texture.fromImage(AppStore.Preloader.getImageURL('gemstone-experience-shoe-1'))),
			new PIXI.Sprite(PIXI.Texture.fromImage(AppStore.Preloader.getImageURL('gemstone-experience-shoe-2')))
		]

	    this.onMouseOver = this.onMouseOver.bind(this)
		this.onMouseOut = this.onMouseOut.bind(this)
		this.button.on('mouseenter', this.onMouseOver)
		this.button.on('mouseleave', this.onMouseOut)
	}
	onMouseOver(e) {
		e.preventDefault()
		this.activationInterval = setInterval(this.toggleActivationStep, 1000)
	}
	toggleActivationStep() {
		this.stepsCounter += 1
		if(this.stepsCounter > 5) {
			this.resetActivationState()
			this.stateToShowroom()
			clearTimeout(this.showroomTimeout)
			this.showroomTimeout = setTimeout(()=>{
				this.state = 'normal'
				this.updateMousePos()		
			}, 2500)
		}
	}
	stateToShowroom() {
		this.state = 'showroom'
	}
	resetActivationState() {
		this.stepsCounter = 0
		clearInterval(this.activationInterval)
	}
	resetValues() {
		this.uniforms.zoom.value += (2 - this.uniforms.zoom.value) * 0.05
		this.uniforms.twirl.value += (1 - this.uniforms.twirl.value) * 0.1
		this.uniforms.brightness.value += (1.25 - this.uniforms.brightness.value) * 0.1
		this.uniforms.iterations.value = 2
	}
	onMouseOut(e) {
		e.preventDefault()
		this.resetActivationState()
	}
	onMouseMove(e) {
		e.preventDefault()
		this.updateMousePos()
	}
	updateMousePos() {
		this.mouseVec.normalMiddle.x = this.mouseVec.middle.x
		this.mouseVec.normalMiddle.y = this.mouseVec.middle.y
		this.mouseVec.normalMouse.x = AppStore.Mouse.x
		this.mouseVec.normalMouse.y = AppStore.Mouse.y
		var dist = this.mouseVec.normalMiddle.distanceTo(this.mouseVec.normalMouse)
		this.mouseVec.normalDist = (dist / this.mouseVec.radius) * 1.2
	}
	update() {
		super.update()

		if(this.state == 'normal') {
			var time = 0.005 + (0.02 - (this.mouseVec.normalDist * 0.02)) + (this.stepsCounter * 0.001)
			time = Math.max(time, 0.007)
			this.uniforms.time.value += time

			var zoom = 0.8 + ((1 * this.mouseVec.normalDist) * 0.6) + (this.stepsCounter * 0.1)
			this.uniforms.zoom.value += (zoom - this.uniforms.zoom.value) * 0.02

			var twirl = 0.8 + ((1 * this.mouseVec.normalDist) * 0.6) + (this.stepsCounter * 0.4)
			this.uniforms.twirl.value += (twirl - this.uniforms.twirl.value) * 0.06

			var brightness = 0.8 + ((1 * this.mouseVec.normalDist) * 1)
			this.uniforms.brightness.value += (brightness - this.uniforms.brightness.value) * 0.08

			var iterations = Math.round(2 + (0.01 - (this.mouseVec.normalDist * 0.01)))
			this.uniforms.iterations.value += (iterations - this.uniforms.iterations.value) * 0.1
		}else{
			this.mouseVec.normalDist = 1
			var time = 0.001 + (0.02 - (this.mouseVec.normalDist * 0.02))
			this.uniforms.time.value += time

			this.resetValues()
		}
	}
	resize() {
		var windowW = AppStore.Window.w
		var windowH = AppStore.Window.h
		this.sprite.width = windowW
		this.sprite.height = windowH
		this.uniforms.resolution.value.x = windowW
		this.uniforms.resolution.value.y = windowH
		this.mouseVec.middle.x = windowW >> 1
		this.mouseVec.middle.y = windowH >> 1
		this.mouseVec.radius = (windowW > windowH) ? (windowW >> 1) : (windowH >> 1)

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
	componentWillUnmount() {
		$('#app-container').off('mousemove', this.onMouseMove)
		this.button.off('mouseenter', this.onMouseOver)
		this.button.off('mouseleave', this.onMouseOut)
		super.componentWillUnmount()
	}
}
