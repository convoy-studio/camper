import BaseXP from 'BaseXP'
import AppStore from 'AppStore'
import Utils from 'Utils'

export default class WoodXP extends BaseXP {
	constructor(parentContainer, parentElement) {
		super(parentContainer, parentElement)
	}
	componentDidMount() {

		this.circles = {
			container: AppStore.getContainer(),
			parts: []
		}
		this.pxContainer.addChild(this.circles.container)

		var tintColors = [
			'0xcd7a42',
			'0x5d2312',
			'0xcd7a42',
			'0xc06b3b',
			'0xcd7a42',
		]

		var previousScale = 0.01;
		for (var i = 25; i >= 0; i--) {
			var part = new PIXI.Sprite(PIXI.Texture.fromImage(AppStore.Preloader.getImageURL('wood-experience-wood-part')))
			part.anchor.x = part.anchor.y = 0.5
			part.rotation = Utils.Rand(0, 2)

			var scale = 0.08
			var offset = 0.001 * i
			part.scale.x = part.scale.y = previousScale
			previousScale += scale + offset

			// part.tint = tintColors[parseInt(Utils.Rand(0, tintColors.length-1), 0)]

			this.circles.container.addChild(part)
			this.circles.parts[i] = part
		};

		super.componentDidMount()
	}
	update() {
		super.update()
	}
	resize() {
		var windowW = AppStore.Window.w
		var windowH = AppStore.Window.h
		this.circles.container.x = (windowW >> 1)
		this.circles.container.y = (windowH >> 1)

		super.resize()
	}
	componentWillUnmount() {
		super.componentWillUnmount()
	}
}

