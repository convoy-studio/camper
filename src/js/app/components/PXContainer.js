import AppStore from 'AppStore'
import AppConstants from 'AppConstants'

export default class PXContainer {
	constructor() {
	}
	init(elementId) {

		this.didHasherChange = this.didHasherChange.bind(this)
		AppStore.on(AppConstants.PAGE_HASHER_CHANGED, this.didHasherChange)
		AppStore.on(AppConstants.PAGE_HASHER_INTERNAL_CHANGE, this.didHasherChange)

		// this.renderer = new PIXI.CanvasRenderer(800, 600)
		this.renderer = new PIXI.autoDetectRenderer(800, 600, { antialias: true })
		this.oldColor = "0xffffff"
		this.newColor = "0xffffff"

		this.colorTween = {color:this.oldColor}

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
	didHasherChange() {
		var pageId = AppStore.getPageId()
		var palette = AppStore.paletteColorsById(pageId)
		// this.oldColor = this.newColor
		// this.newColor = palette[0]
		// console.log(this.oldColor, this.newColor)
		// if(palette != undefined) TweenMax.to(this.renderer, 1, { colorProps: {backgroundColor:"red"}})
		// if(palette != undefined) TweenMax.to(this.colorTween, 1, { colorProps: {color:this.newColor}, onUpdate: ()=>{
		// 	console.log(this.colorTween.color)
		// }})
		if(palette != undefined) this.renderer.backgroundColor = palette[0]
	}
}
