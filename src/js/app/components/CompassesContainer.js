import AppStore from 'AppStore'
import Compass from 'Compass'

export default class CompassesContainer {
	constructor(pxContainer) {
		this.pxContainer = pxContainer
	}
	componentDidMount() {
		this.container = AppStore.getContainer()

		this.compass = new Compass(this.container)
		this.compass.componentDidMount()
		this.compass.highlightPlanet('alaska')
	}
	update() {
		this.compass.update()
	}
	resize() {
		this.compass.resize()
	}
	componentWillUnmount() {
		this.container.removeChildren()
		AppStore.releaseContainer(this.container)
	}
}
