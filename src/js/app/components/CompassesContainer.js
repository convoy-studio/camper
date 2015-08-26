import AppStore from 'AppStore'
import Compass from 'Compass'
import AppConstants from 'AppConstants'
import SmallCompass from 'SmallCompass'

export default class CompassesContainer {
	constructor(pxContainer, parentEl) {
		this.parentEl = parentEl
		this.pxContainer = pxContainer
		this.currentIndex = 0
	}
	componentDidMount() {
		this.container = AppStore.getContainer()
		this.pxContainer.addChild(this.container)

		this.compasses = []

		this.mainCompass = new Compass(this.container, AppConstants.EXPERIENCE)
		this.mainCompass.knotRadius = AppConstants.SMALL_KNOT_RADIUS
		this.mainCompass.componentDidMount()
		this.mainCompass.state = AppConstants.OPEN

		var infos = AppStore.generalInfosLangScope()

		var planets = AppStore.planets()
		for (var i = 0; i < planets.length; i++) {
			var planet = planets[i]
			var smallCompass = new SmallCompass(this.container, AppConstants.EXPERIENCE)
			var planetData = AppStore.productsDataById(planet)
			smallCompass.state = AppConstants.CLOSE
			smallCompass.id = planet
			smallCompass.componentDidMount(planetData, planet, this.parentEl, infos.planet)
			this.compasses[i] = smallCompass
			if(planet == this.id) {
				this.mainCompass.id = planet
				this.openedCompassIndex = i
				smallCompass.state = AppConstants.OPEN
				this.closeCompass(i)
			}
		}
	}
	didTransitionInComplete() {
		this.updateCompassProduct()
		for (var i = 0; i < this.compasses.length; i++) {
			this.compasses[i].didTransitionInComplete()
		};
		this.mainCompass.updateRadius()
		this.mainCompass.didTransitionInComplete()
	}
	willTransitionOut() {
		for (var i = 0; i < this.compasses.length; i++) {
			this.compasses[i].willTransitionOut()
		};	
		this.mainCompass.willTransitionOut()
	}
	update() {
		for (var i = 0; i < this.compasses.length; i++) {
			this.compasses[i].update()
		};
		this.mainCompass.update()
	}
	updateCompassProduct() {
		var planetData = AppStore.productsDataById(this.id)
		var productData = [planetData[this.currentIndex]]
		this.mainCompass.updateData(productData)
	}
	changeData(newId) {
		this.id = newId
		var planets = AppStore.planets()
		for (var i = 0; i < planets.length; i++) {
			var planet = planets[i]
			var compass = this.compasses[i]
			if(planet == this.id) { 
				this.mainCompass.id = planet
				this.openedCompassIndex = i
				compass.state = AppConstants.OPEN
				this.closeCompass(i)
			}else{
				compass.state = AppConstants.CLOSE
				this.openCompass(i)
			}
		}
		this.resize()
		this.positionTitleElements(this.y)
		this.updateCompassProduct()
	}
	openCompass(index) {
		var compass = this.compasses[index]
		compass.opacity(1)
	}
	closeCompass(index) {
		var compass = this.compasses[index]
		compass.opacity(0)
	}
	resize() {
		var windowW = AppStore.Window.w
		var windowH = AppStore.Window.h

		var compasses = this.compasses
		var totalW = 0
		var biggestRadius = 0
		for (var i = 0; i < compasses.length; i++) {
			var compass = compasses[i]
			var size = (compass.radius << 1)
			var previousCmp = compasses[i-1]
			var nextCmp = compasses[i+1]
			var cx = totalW + this.getCompassMargin(compass)
			compass.resize()
			biggestRadius = biggestRadius < compass.radius ? compass.radius : biggestRadius
			compass.position(cx, 0)
			compass.posX = cx
			totalW = cx + this.getCompassMargin(compass)

			if(compass.state == AppConstants.OPEN) {
				this.mainCompass.position(
					compass.x,
					0
				)
			}
		}

		this.mainCompass.resize()

		this.width = totalW
		this.height = biggestRadius
	}
	position(x, y) {
		this.x = x
		this.y = y
		this.container.position.x = x
		this.container.position.y = y
		this.positionTitleElements(y)
	}
	positionTitleElements(y) {
		var windowW = AppStore.Window.w
		var compasses = this.compasses
		for (var i = 0; i < compasses.length; i++) {
			var compass = compasses[i]
			compass.positionElement(
				compass.posX + (windowW >> 1) - (this.width >> 1),
				y
			)
		}
	}
	getCompassMargin(compass) {
		return (compass.state == AppConstants.OPEN) ? 140 : 80
	}
	componentWillUnmount() {
		for (var i = 0; i < this.compasses.length; i++) {
			this.compasses[i].componentWillUnmount()
		}
		this.mainCompass.componentWillUnmount()
		this.container.removeChildren()
		AppStore.releaseContainer(this.container)
	}
}
