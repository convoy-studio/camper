import BasePlanetPage from 'BasePlanetPage'
import AppActions from 'AppActions'
import AppStore from 'AppStore'

export default class PlanetCampaignPage extends BasePlanetPage {
	constructor(props) {
		super(props)
	}
	componentDidMount() {
		var bunnyUrl = this.getImageUrlById('bunny')
		var texture = PIXI.Texture.fromImage(bunnyUrl)
		var bunny = new PIXI.Sprite(texture)

		this.g = new PIXI.Graphics()
		this.pxContainer.addChild(this.g)

		this.pxContainer.addChild(bunny)
		bunny.x = 500
		bunny.y = 500

		super.componentDidMount()
	}
	didTransitionOutComplete() {
		super.didTransitionOutComplete()
	}
	resize() {
		var windowW = AppStore.Window.w
		var windowH = AppStore.Window.h

		// draw a rectangle
		this.g.clear()
		this.g.beginFill(Math.random() * 0xffffff)
		this.g.drawRect(0, 0, windowW, windowH)
		this.g.endFill()

		super.resize()
	}
}
