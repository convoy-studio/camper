import AppStore from 'AppStore'
import AppConstants from 'AppConstants'

export default class PXContainer {
	constructor() {
	}
	init(elementId) {

		this.didHasherChange = this.didHasherChange.bind(this)
		AppStore.on(AppConstants.PAGE_HASHER_CHANGED, this.didHasherChange)
		AppStore.on(AppConstants.PAGE_HASHER_INTERNAL_CHANGE, this.didHasherChange)

		if(AppStore.Detector.isMobile) {
		} else {
			this.renderer = new PIXI.autoDetectRenderer(1, 1, { antialias: true })
			this.currentColor = undefined
			var el = $(elementId)
			$(this.renderer.view).attr('id', 'px-container')
			el.append(this.renderer.view)
			this.stage = new PIXI.Container()
			this.background = new PIXI.Graphics()
			this.drawBackground(0x000000)
			this.stage.addChild(this.background)
		}
	}
	drawBackground(color) {
		var windowW = AppStore.Window.w
		var windowH = AppStore.Window.h

		this.background.lineStyle(0);
		this.background.beginFill(color, 1);
		this.background.drawRect(0, 0, windowW, windowH);
		this.background.endFill();
	}
	add(child) {
		if(AppStore.Detector.isMobile) return
		this.stage.addChild(child)
	}
	remove(child) {
		if(AppStore.Detector.isMobile) return
		this.stage.removeChild(child)
	}
	update() {
		if(AppStore.Detector.isMobile) return
	    this.renderer.render(this.stage)
	}
	resize() {
		if(AppStore.Detector.isMobile) return
		// var scale = (window.devicePixelRatio == undefined) ? 1 : window.devicePixelRatio
		var scale = 1
		var windowW = AppStore.Window.w
		var windowH = AppStore.Window.h
		this.renderer.resize(windowW * scale, windowH * scale)

		this.drawBackground(this.currentColor)
	}
	didHasherChange() {
		var pageId = AppStore.getPageId()
		var palette = AppStore.paletteColorsById(pageId)
		if(AppStore.Detector.isMobile) {
			if(palette != undefined) {
				var c = palette[0]
				this.currentColor = c
				$('html').css('background-color', c.replace('0x', '#'))
			}
		}else{
			if(palette != undefined) {
				var c = palette[0]
				this.currentColor = c
				this.drawBackground(c)
			}
		}
	}
}
