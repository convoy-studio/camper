import BaseXP from 'BaseXP'
import AppStore from 'AppStore'
import Vec2 from 'Vec2'
import Utils from 'Utils'
const glslify = require('glslify')

export default class GemStoneXP extends BaseXP {
	constructor(parentContainer, parentElement) {
		super(parentContainer, parentElement)
	}
	componentDidMount() {
		this.mouseVec = {
			middle: new Vec2(0, 0),
			normalMiddle: new Vec2(0, 0),
			normalMouse: new Vec2(0, 0),
			radius: 0,
			normalDist: 0
		}

		this.stepsCounter = 0
		this.state = 'normal'
		this.shoeIndex = 0
		this.counter = 0

		this.button = $('<div class="xp-button"></div>')
		this.element.append(this.button)

		AppStore.Sounds.play('gemstone-sounds-reveal-1', { loop:-1 })

		var explosionFrag = glslify('../shaders/gemstone/diffusion-mix-frag.glsl')
		var imgUrl = AppStore.Preloader.getImageURL('gemstone-experience-texture')
		var texture = PIXI.Texture.fromImage(imgUrl)
		this.sprite = AppStore.getSprite()
		this.sprite.texture = texture
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

	    this.illusion = {
	    	holder: AppStore.getContainer(),
	    	mask: AppStore.getSprite(),
	    	maskFilter: undefined,
	    	shoeContainer: AppStore.getContainer(),
	    	shoeWrapper: AppStore.getContainer(),
	    	displacementMapTexture: AppStore.getSprite(),
	    	backgroundSpr: AppStore.getSprite(),
	    }

	    this.illusion.displacementMapTexture.texture = PIXI.Texture.fromImage(AppStore.Preloader.getImageURL('gemstone-experience-displacement-map'))
	    this.illusion.backgroundSpr.texture = PIXI.Texture.fromImage(AppStore.Preloader.getImageURL('gemstone-experience-background-texture'))
	    this.illusion.mask.texture = PIXI.Texture.fromImage(AppStore.Preloader.getImageURL('gemstone-experience-gradient-mask'))
	    this.illusion.maskFilter = new PIXI.filters.DisplacementFilter(this.illusion.displacementMapTexture)

	    this.shoes = [
			AppStore.getSprite(),
			AppStore.getSprite(),
			AppStore.getSprite()
		]

		this.shoes[0].texture = PIXI.Texture.fromImage(AppStore.Preloader.getImageURL('gemstone-experience-shoe-0'))
		this.shoes[1].texture = PIXI.Texture.fromImage(AppStore.Preloader.getImageURL('gemstone-experience-shoe-1'))
		this.shoes[2].texture = PIXI.Texture.fromImage(AppStore.Preloader.getImageURL('gemstone-experience-shoe-2'))

		this.onMouseMove = this.onMouseMove.bind(this)
		this.toggleActivationStep = this.toggleActivationStep.bind(this)
	    this.onMouseOver = this.onMouseOver.bind(this)
		this.onMouseOut = this.onMouseOut.bind(this)
		this.button.on('mouseenter', this.onMouseOver)
		this.button.on('mouseleave', this.onMouseOut)
	    $('#app-container').on('mousemove', this.onMouseMove)

		this.setupIllusion()
		super.componentDidMount()
	}
	setupIllusion() {
		var ll = this.illusion
		this.pxContainer.addChild(ll.holder)
		ll.holder.addChild(ll.shoeContainer)
		ll.shoeContainer.addChild(ll.backgroundSpr)
		ll.shoeContainer.addChild(ll.shoeWrapper)
		ll.holder.addChild(ll.mask)
		ll.holder.addChild(ll.displacementMapTexture)

		ll.backgroundSpr.anchor.x = 0.5
		ll.backgroundSpr.anchor.y = 0.5
		ll.displacementMapTexture.anchor.x = 0.5
		ll.displacementMapTexture.anchor.y = 0.5
		ll.mask.anchor.x = 0.5
		ll.mask.anchor.y = 0.5
		ll.holder.pivot.x = 0.5
		ll.holder.pivot.y = 0.5
		ll.shoeContainer.pivot.x = 0.5
		ll.shoeContainer.pivot.y = 0.5
		ll.shoeWrapper.pivot.x = 0.5
		ll.shoeWrapper.pivot.y = 0.5
		ll.mask.scale.x = 0
		ll.mask.scale.y = 0
		ll.backgroundSpr.scale.x = 0
		ll.backgroundSpr.scale.y = 0

		ll.holder.filters = [ll.maskFilter]
		ll.shoeContainer.mask = ll.mask
	}
	onMouseOver(e) {
		e.preventDefault()
		this.activationInterval = setInterval(this.toggleActivationStep, 1000)
		AppStore.Sounds.play('gemstone-sounds-reveal-0', { interrupt: createjs.Sound.INTERRUPT_ANY, volume:0.1 })
	}
	toggleActivationStep() {
		this.stepsCounter += 3
		if(this.stepsCounter > 5) {
			this.resetActivationState()
			this.stateToShowroom()
			this.animateInShoe()
			clearTimeout(this.showroomTimeout)
			AppStore.Sounds.play('gemstone-sounds-cave-return')
			this.showroomTimeout = setTimeout(()=>{
				this.state = 'normal'
				this.updateMousePos()
				this.animateOutShoe()
			}, 2800)
		}
	}
	stateToShowroom() {
		this.state = 'showroom'
	}
	resetActivationState() {
		this.stepsCounter = 0
		clearInterval(this.activationInterval)
	}
	animateInShoe() {
		var ll = this.illusion

		this.shoeIndex += 1
		this.shoeIndex = (this.shoeIndex > this.shoes.length-1) ? 0 : this.shoeIndex
		this.shoeIndex = (this.shoeIndex < 0) ? this.shoes.length-1 : this.shoeIndex
		this.currentShoe = this.shoes[this.shoeIndex]
		this.currentShoe.anchor.x = 0.5
		this.currentShoe.anchor.y = 0.5
		ll.shoeWrapper.rotation = 0

		TweenMax.fromTo(ll.backgroundSpr.scale, 2, {x:1.8, y:1.8}, { x:1.6, y:1.6, ease:Expo.easeOut })
		TweenMax.fromTo(ll.mask.scale, 2, {x:0, y:0}, { x:4.1, y:3.6, ease:Elastic.easeOut })
		TweenMax.fromTo(this.currentShoe.scale, 2, {x:0, y:0}, { x:1.2, y:1.2, ease:Elastic.easeOut })
		TweenMax.fromTo(this.currentShoe, 2, {rotation:Utils.Rand(-1, 1)}, { rotation:0, ease:Elastic.easeOut })

		ll.shoeWrapper.addChild(this.currentShoe)
	}
	animateOutShoe() {
		var ll = this.illusion

		TweenMax.to(ll.backgroundSpr.scale, 1.6, { x:0, y:0, ease:Expo.easeInOut })
		TweenMax.to(ll.mask.scale, 1.4, { x:0, y:0, ease:Expo.easeInOut })
		TweenMax.to(this.currentShoe.scale, 1.6, { x:0, y:0, ease:Expo.easeInOut })
		TweenMax.to(ll.shoeWrapper, 1.6, { rotation:Utils.Rand(-3, -2), ease:Expo.easeInOut })

		setTimeout(()=>{
			ll.shoeWrapper.removeChild(this.currentShoe)
		}, 1600)
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

		this.counter += 0.04

		this.illusion.maskFilter.maskSprite.scale.x = 1 + Math.sin(this.counter) * 0.4
		this.illusion.maskFilter.maskSprite.scale.y = 1 + Math.sin(this.counter) * 0.4
		this.illusion.maskFilter.maskSprite.rotation += 0.01

		this.illusion.shoeWrapper.rotation = Math.sin(this.counter) * 0.1
		this.illusion.shoeWrapper.x = Math.sin(this.counter) * 10
		this.illusion.shoeWrapper.y = Math.cos(this.counter) * 20
		this.illusion.shoeWrapper.scale.x = 1 + Math.sin(this.counter) * 0.101
		this.illusion.shoeWrapper.scale.y = 1 + Math.sin(this.counter) * 0.1

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

		this.illusion.holder.x = windowW >> 1
		this.illusion.holder.y = windowH >> 1

		super.resize()
	}
	componentWillUnmount() {
		clearInterval(this.activationInterval)
		clearTimeout(this.showroomTimeout)
		$('#app-container').off('mousemove', this.onMouseMove)
		this.button.off('mouseenter', this.onMouseOver)
		this.button.off('mouseleave', this.onMouseOut)

		for (var i = 0; i < this.shoes.length; i++) {
			var shoe = this.shoes[i]
			AppStore.releaseSprite(shoe)	
		};

		this.illusion.holder.filters = null
		this.illusion.holder.removeChildren()
		AppStore.releaseSprite(this.sprite)
		AppStore.releaseSprite(this.illusion.mask)
		AppStore.releaseSprite(this.illusion.displacementMapTexture)
		AppStore.releaseSprite(this.illusion.backgroundSpr)
		AppStore.releaseContainer(this.illusion.holder)
		this.illusion.shoeContainer.removeChildren()
		AppStore.releaseContainer(this.illusion.shoeContainer)
		this.illusion.shoeWrapper.removeChildren()
		AppStore.releaseContainer(this.illusion.shoeWrapper)
		super.componentWillUnmount()
	}
}
