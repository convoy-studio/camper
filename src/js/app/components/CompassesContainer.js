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
		mainCompass.knotRadius = 3
		mainCompass.componentDidMount()

		var planets = AppStore.planets()
		for (var i = 0; i < planets.length; i++) {
			var planet = planets[i]
			if(planet == this.id) {
				this.compasses[i] = mainCompass
				this.openedCompassIndex = i
			}else{
				var smallCompass = new SmallCompass(this.container, AppConstants.EXPERIENCE)
				smallCompass.knotRadius = 3
				smallCompass.componentDidMount()
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

		for (var i = 0; i < this.compasses.length; i++) {
			this.compasses[i].resize()
		};

		this.container.position.x = windowW >> 1
		this.container.position.y = (windowH >> 1) - (windowH * 0.05)
	}
	componentWillUnmount() {
		for (var i = 0; i < this.compasses.length; i++) {
			this.compasses[i].componentWillUnmount()
		};
		this.container.removeChildren()
		AppStore.releaseContainer(this.container)
	}
}
