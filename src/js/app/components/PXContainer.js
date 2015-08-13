import AppStore from 'AppStore'

export default class PXContainer {
	constructor() {
	}
	init(elementId) {
		// this.renderer = new PIXI.CanvasRenderer(800, 600)
		this.renderer = new PIXI.autoDetectRenderer(800, 600)

		var el = $(elementId)
		$(this.renderer.view).attr('id', 'px-container')
		el.append(this.renderer.view)

		this.stage = new PIXI.Container()
	}
	add(child) {
		this.stage.addChild(child)
	}
	remove(child) {
		this.stage.removeChild(child)
	}
	update() {
	    this.renderer.render(this.stage)
	}
	resize() {
		var windowW = AppStore.Window.w
		var windowH = AppStore.Window.h
		this.renderer.resize(windowW, windowH)
	}
}
