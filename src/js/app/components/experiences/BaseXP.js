import AppStore from 'AppStore'

export default class BaseXP {
	constructor(parentContainer, parentElement, topParent) {
		this.pxContainer = AppStore.getContainer()
		this.element = parentElement
		this.parent = topParent
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
