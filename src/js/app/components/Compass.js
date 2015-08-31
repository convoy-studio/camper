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
	 	this.getRadius()
	}
	updateData(data) {
		this.removePreviousSpringGardens()
		this.springGardens = []
		for (var i = 0; i < data.length; i++) {
			var springGarden = AppStore.getSpringGarden()
			var product = data[i]
			var color = product.color
			springGarden.id = this.id
			springGarden.radius = this.radius
			springGarden.knotRadius = this.knotRadius
			springGarden.componentDidMount(product, this.type)
			this.container.addChild(springGarden.container)
			this.springGardens[i] = springGarden
		}
	}
	removePreviousSpringGardens() {
		for (var i = 0; i < this.springGardens.length; i++) {
			var springGarden = this.springGardens[i]
			springGarden.clear()
			springGarden.componentWillUnmount()
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
	getRadius() {
		var windowH = AppStore.Window.h
		var sizePercentage = (this.type == AppConstants.EXPERIENCE || this.type == AppConstants.CAMPAIGN) ? AppConstants.COMPASS_SMALL_SIZE_PERCENTAGE : AppConstants.COMPASS_SIZE_PERCENTAGE
		this.radius = windowH * sizePercentage
	}
	didTransitionInComplete() {
	}
	willTransitionOut() {
	}
	updateRadius() {
		this.getRadius()
		this.rings.resize(this.radius)
	}
	resize() {
		if(this.type == AppConstants.LANDING) {
			this.updateRadius()
		}
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
	scale(x, y) {
		this.container.scale.x = x
		this.container.scale.y = y
		this.scaleX = x
		this.scaleY = y	
	}
	positionElement(x, y) {

	}
	componentWillUnmount() {
		this.container.removeChildren()
		AppStore.releaseContainer(this.container)
		this.removePreviousSpringGardens()
		this.rings.componentWillUnmount()
	}
}
