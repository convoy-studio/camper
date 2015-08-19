import AppStore from 'AppStore'
import Compass from 'Compass'
import AppConstants from 'AppConstants'

export default class CompassesContainer {
	constructor(pxContainer) {
		this.pxContainer = pxContainer
	}
	componentDidMount() {
		this.container = AppStore.getContainer()
		this.pxContainer.addChild(this.container)

		this.compass = new Compass(this.container, AppConstants.EXPERIENCE)
		this.compass.componentDidMount()
	}
	didTransitionInComplete() {
		var planetData = AppStore.productsDataById(this.id)
		this.compass.updateData(planetData)
	}
	update() {
		this.compass.update()
	}
	resize() {
		var windowW = AppStore.Window.w
		var windowH = AppStore.Window.h

		this.compass.resize()

		this.compass.position(
			windowW >> 1,
			(windowH >> 1) - (windowH * 0.05)
		)
	}
	componentWillUnmount() {
		this.compass.componentWillUnmount()
		this.container.removeChildren()
		AppStore.releaseContainer(this.container)
	}
}
