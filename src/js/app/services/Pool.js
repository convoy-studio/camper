import AppStore from 'AppStore'
import SpringGarden from 'SpringGarden'

export default class Pool {
	constructor() {
		var planets = AppStore.planets()
		var pxContainerNum = 20 + (planets.length * 1)
		var graphicsNum = (planets.length * 3) - 2
		var spritesNum = planets.length
		var springGardensNum = 12
	
		if(!AppStore.Detector.oldIE) {
			var op = window.ObjectPool;
			this.timelines = op.generate(TimelineMax, { count: 20 })
			this.pxContainers = op.generate(PIXI.Container, { count: pxContainerNum })
			this.graphics = op.generate(PIXI.Graphics, { count: graphicsNum })
			this.sprites = op.generate(PIXI.Sprite, { count: spritesNum })
			this.springGardens = op.generate(SpringGarden, { count: springGardensNum })
		}		
	}
	getTimeline() {
		var tl = (AppStore.Detector.oldIE) ? new TimelineMax() : this.timelines.get()
		tl.kill()
		tl.clear()
		return tl
	}
	releaseTimeline(item) {
		item.kill()
		item.clear()
		if(!AppStore.Detector.oldIE) {
			this.timelines.release(item)
		}
	}
	getContainer() {
		if(AppStore.Detector.oldIE) return
		var container = this.pxContainers.get()
		container.scale.x = 1
		container.scale.y = 1
		container.position.x = 0
		container.position.y = 0
		container.pivot.x = 0
		container.pivot.y = 0
		container.rotation = 0
		container.alpha = 1
		return container
	}
	releaseContainer(item) {
		if(AppStore.Detector.oldIE) return
		this.pxContainers.release(item)
	}
	getGraphics() {
		if(AppStore.Detector.oldIE) return
		var g = this.graphics.get()
		g.clear()
		g.scale.x = 1
		g.scale.y = 1
		g.position.x = 0
		g.position.y = 0
		g.pivot.x = 0
		g.pivot.y = 0
		g.rotation = 0
		return g
	}
	releaseGraphics(item) {
		if(AppStore.Detector.oldIE) return
		this.graphics.release(item)
	}
	getSprite() {
		if(AppStore.Detector.oldIE) return
		return this.sprites.get()
	}
	releaseSprite(item) {
		if(AppStore.Detector.oldIE) return
		this.sprites.release(item)
	}
	getSpringGarden() {
		if(AppStore.Detector.oldIE) return
		// console.log('get >>>>>>>>>>>>>>>')
		return this.springGardens.get()
	}
	releaseSpringGarden(item) {
		if(AppStore.Detector.oldIE) return
		// console.log('release <<<<<<<<<<<<<<', item)
		this.springGardens.release(item)
	}
}
