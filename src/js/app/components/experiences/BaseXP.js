import AppStore from 'AppStore'

export default class BaseXP {
	constructor(parentContainer) {
		this.pxContainer = AppStore.getContainer()
		this.parentContainer = parentContainer
		this.parentContainer.addChild(this.pxContainer)
	}
	componentDidMount() {
	}
	update() {
	}
	resize() {
	}
	componentWillUnmount() {
		this.parentContainer.removeChild(this.pxContainer)
		this.pxContainer.removeChildren()
		AppStore.releaseContainer(this.pxContainer)
	}
}
