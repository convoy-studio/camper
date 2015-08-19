import AppStore from 'AppStore'
import AppConstants from 'AppConstants'

export default class SmallCompass {
	constructor(pxContainer, type) {
		this.pxContainer = pxContainer
		this.type = type || AppConstants.LANDING
	}
	componentDidMount() {
		this.container = AppStore.getContainer()
		this.pxContainer.addChild(this.container)
	}
	update() {
	}
	resize() {
		var windowH = AppStore.Window.h
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
	}
}
