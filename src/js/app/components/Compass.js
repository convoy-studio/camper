import AppStore from 'AppStore'
import AppConstants from 'AppConstants'
import SpringGarden from 'SpringGarden'
import CompassRings from 'CompassRings'

export default class Compass {
	constructor(pxContainer, type) {
		this.pxContainer = pxContainer
		this.type = type || AppConstants.LANDING
	}
	componentDidMount() {
		this.container = AppStore.getContainer()
		this.pxContainer.addChild(this.container)

 		this.rings = new CompassRings(this.container)
	 	this.rings.componentDidMount()

	 	this.springGardens = []
	}
	updateData(data) {
		this.removePreviousSpringGardens()
		this.springGardens = []
		for (var i = 0; i < data.length; i++) {
			var springGarden = AppStore.getSpringGarden()
			var product = data[i]
			springGarden.radius = this.radius
			springGarden.knotRadius = this.knotRadius
			springGarden.componentDidMount(product.knots, product.color)
			this.container.addChild(springGarden.container)
			this.springGardens[i] = springGarden
		}
	}
	removePreviousSpringGardens() {
		for (var i = 0; i < this.springGardens.length; i++) {
			var springGarden = this.springGardens[i]
			this.container.removeChild(springGarden.container)
			AppStore.releaseSpringGarden(springGarden)
		}
	}
	update() {
		if(this.springGardens.length < 1) return 
	 	for (var i = 0; i < this.springGardens.length; i++) {
			var springGarden = this.springGardens[i]
			springGarden.update()
		}
	}
	resize() {
		var windowH = AppStore.Window.h
		var sizePercentage = (this.type == AppConstants.EXPERIENCE || this.type == AppConstants.CAMPAIGN) ? AppConstants.COMPASS_SMALL_SIZE_PERCENTAGE : AppConstants.COMPASS_SIZE_PERCENTAGE
		this.radius = windowH * sizePercentage
		this.rings.resize(this.radius)

		if(this.springGardens.length < 1) return 
	 	for (var i = 0; i < this.springGardens.length; i++) {
			var springGarden = this.springGardens[i]
			springGarden.resize(this.radius)
		}
	}
	position(x, y) {
		this.container.x = x
		this.container.y = y
		this.x = x
		this.y = y
	}
	componentWillUnmount() {
		this.container.removeChildren()
		AppStore.releaseContainer(this.container)
		this.removePreviousSpringGardens()
		this.rings.componentWillUnmount()
	}
}
