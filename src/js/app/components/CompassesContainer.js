import AppStore from 'AppStore'
import Compass from 'Compass'
import AppConstants from 'AppConstants'
import SmallCompass from 'SmallCompass'

export default class CompassesContainer {
	constructor(pxContainer) {
		this.pxContainer = pxContainer
	}
	componentDidMount() {
		this.container = AppStore.getContainer()
		this.pxContainer.addChild(this.container)

		this.compasses = []

		var mainCompass = new Compass(this.container, AppConstants.EXPERIENCE)
		mainCompass.knotRadius = AppConstants.SMALL_KNOT_RADIUS
		mainCompass.componentDidMount()

		var planets = AppStore.planets()
		for (var i = 0; i < planets.length; i++) {
			var planet = planets[i]
			if(planet == this.id) {
				this.compasses[i] = mainCompass
				this.openedCompassIndex = i
			}else{
				var smallCompass = new SmallCompass(this.container, AppConstants.EXPERIENCE)
				var planetData = AppStore.productsDataById(planet)
				smallCompass.componentDidMount(planetData)
				this.compasses[i] = smallCompass
			}
		}
	}
	didTransitionInComplete() {
		var planetData = AppStore.productsDataById(this.id)
		this.compasses[this.openedCompassIndex].updateData(planetData)
	}
	update() {
		for (var i = 0; i < this.compasses.length; i++) {
			this.compasses[i].update()
		};
	}
	resize() {
		var windowW = AppStore.Window.w
		var windowH = AppStore.Window.h

		var compasses = this.compasses
		var totalW = 0
		var biggestRadius = 0
		for (var i = 0; i < compasses.length; i++) {
			var compass = compasses[i]
			var cx = i * 200
			compass.resize()
			biggestRadius = biggestRadius < compass.radius ? compass.radius : biggestRadius
			compass.position(cx, 0)
			totalW = cx
		}

		this.container.position.x = (windowW >> 1) - (totalW >> 1)
		this.container.position.y = (windowH) - biggestRadius - (windowH * 0.1)
	}
	componentWillUnmount() {
		for (var i = 0; i < this.compasses.length; i++) {
			this.compasses[i].componentWillUnmount()
		};
		this.container.removeChildren()
		AppStore.releaseContainer(this.container)
	}
}
