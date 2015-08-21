import BasePlanetPage from 'BasePlanetPage'
import AppActions from 'AppActions'
import AppStore from 'AppStore'
import Router from 'Router'
import Compass from 'Compass'
import AppConstants from 'AppConstants'

export default class PlanetCampaignPage extends BasePlanetPage {
	constructor(props) {
		super(props)
		this.productId = undefined
		this.fromInternalChange = false
	}
	componentDidMount() {
		this.g = new PIXI.Graphics()
		this.pxContainer.addChild(this.g)

		this.compass = new Compass(this.pxContainer, AppConstants.CAMPAIGN)
		this.compass.knotRadius = AppConstants.SMALL_KNOT_RADIUS
		this.compass.componentDidMount()

		this.checkCurrentProductByUrl()

		super.componentDidMount()
	}
	internalHasherChanged() {
		this.fromInternalChange = true
		this.checkCurrentProductByUrl()
	}
	checkCurrentProductByUrl() {
		var newHasher = Router.getNewHash()
		var productId = parseInt(newHasher.targetId, 10)
		this.showProductById(productId)
	}
	showProductById(id) {
		this.productId = id
		var productScope = AppStore.getSpecificProductById(this.id, this.productId)
	}
	didTransitionInComplete() {
		var planetData = AppStore.productsDataById(this.id)
		this.compass.updateData(planetData)
		super.didTransitionInComplete()
	}
	didTransitionOutComplete() {
		super.didTransitionOutComplete()
	}
	update() {
		this.compass.update()
	}
	resize() {
		var windowW = AppStore.Window.w
		var windowH = AppStore.Window.h

		this.compass.resize()
		this.compass.position(
			windowW >> 1, windowH * 0.16
		)

		// draw a rectangle
		this.g.clear()
		this.g.beginFill(Math.random() * 0x000000)
		this.g.drawRect(0, 0, windowW, windowH)
		this.g.endFill()

		super.resize()
	}
	componentWillUnmount() {
		this.compass.componentWillUnmount()
	}
}
