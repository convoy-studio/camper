import AppStore from 'AppStore'

export default class BaseXP {
	constructor(parentContainer, parentElement, topParent) {
		this.pxContainer = AppStore.getContainer()
		this.element = parentElement
		this.parent = topParent
		this.parentContainer = parentContainer
		this.parentContainer.addChild(this.pxContainer)

		this.containerMask = AppStore.getGraphics()
		this.pxContainer.mask = this.containerMask
		this.parentContainer.addChild(this.containerMask)
	}
	componentDidMount() {
	}
	willTransitionOut() {
	}
	update() {
	}
	resize() {
		var windowW = AppStore.Window.w
		var windowH = AppStore.Window.h

		this.containerMask.clear()
		this.containerMask.lineStyle(0, 0x0000FF, 1)
		this.containerMask.beginFill(0x000000, 1)
		this.containerMask.drawRect(0, 0, windowW, windowH)
		this.containerMask.endFill()
	}
	componentWillUnmount() {
		this.containerMask.clear()
		this.pxContainer.mask = null
		AppStore.Sounds.stopSoundsByPlanetId(this.id)
		this.parentContainer.removeChild(this.pxContainer)
		this.pxContainer.removeChildren()
		AppStore.releaseContainer(this.pxContainer)
		AppStore.releaseGraphics(this.containerMask)
	}
}
