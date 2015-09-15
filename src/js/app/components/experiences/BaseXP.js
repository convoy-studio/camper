import AppStore from 'AppStore'

export default class BaseXP {
	constructor(parentContainer, parentElement, topParent) {
		this.pxContainer = AppStore.getContainer()
		this.element = parentElement
		this.parent = topParent
		this.parentContainer = parentContainer
		this.parentContainer.addChild(this.pxContainer)

		this.containerMask = AppStore.getGraphics()
		this.pxContainer.mask = this.containerMask
		this.parentContainer.addChild(this.containerMask)

		this.cta = {
			container: this.element.find('#cta-container'),
			text: this.element.find('#cta-container .cta-text'),
			wrapper: this.element.find('#cta-container .cta-text-wrapper'),
			background: this.element.find('#cta-container .background')
		}

		this.cta.effectTween = TweenMax.to(this.cta.text, 0.1, { opacity:0, repeat:-1 })
	}
	componentDidMount() {
		this.cta.text.html(this.cta.txt)
	}
	didTransitionInComplete() {
		setTimeout(()=>{
			this.cta.effectTween.pause()
			TweenMax.to(this.cta.wrapper, 0.4, { opacity:0, scale:1.2, force3D:true, ease:Expo.easeOut })
			TweenMax.to(this.cta.background, 0.6, { opacity:0, force3D:true, ease:Expo.easeOut })
			setTimeout(()=>{
				this.cta.container.remove()
			}, 700)
		}, 2500)
	}
	willTransitionOut() {
	}
	update() {
	}
	resize() {
		var windowW = AppStore.Window.w
		var windowH = AppStore.Window.h

		this.containerMask.clear()
		this.containerMask.lineStyle(0, 0x0000FF, 1)
		this.containerMask.beginFill(0x000000, 1)
		this.containerMask.drawRect(0, 0, windowW, windowH)
		this.containerMask.endFill()

		setTimeout(()=>{
			this.cta.wrapper.css({
				top: (windowH >> 1) - (this.cta.text.height() >> 1),
				left: (windowW >> 1) - (this.cta.text.width() >> 1)
			})
		}, 0)

		this.cta.background.css({
			width: windowW,
			height: windowH
		})
	}
	componentWillUnmount() {
		this.containerMask.clear()
		this.pxContainer.mask = null
		AppStore.Sounds.stopSoundsByPlanetId(this.id)
		this.parentContainer.removeChild(this.pxContainer)
		this.pxContainer.removeChildren()
		AppStore.releaseContainer(this.pxContainer)
		AppStore.releaseGraphics(this.containerMask)
		// PIXI.loader.reset()
	}
}
