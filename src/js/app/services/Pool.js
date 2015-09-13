import AppStore from 'AppStore'
import SpringGarden from 'SpringGarden'

export default class Pool {
	constructor() {
		var planets = AppStore.planets()
		var pxContainerNum = 22 + (planets.length * 1)
		var graphicsNum = (planets.length * 3) - 2
		var spritesNum = planets.length + (3*2) + (8*4) + 30
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
		container.x = 0
		container.y = 0
		container.pivot.x = 0
		container.pivot.y = 0
		container.rotation = 0
		container.alpha = 1
		container.blendMode = PIXI.BLEND_MODES.NORMAL
		container.mask = undefined
		container.filters = undefined
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
		// console.log('get >>>>>>>>>>>>>>>')
		if(AppStore.Detector.oldIE) return
		var sprite = this.sprites.get()
		sprite.scale.x = 1
		sprite.scale.y = 1
		sprite.position.x = 0
		sprite.position.y = 0
		sprite.x = 0
		sprite.y = 0
		sprite.anchor.x = 0
		sprite.anchor.y = 0
		sprite.pivot.x = 0
		sprite.pivot.y = 0
		sprite.rotation = 0
		sprite.alpha = 1
		sprite.blendMode = PIXI.BLEND_MODES.NORMAL
		sprite.filters = null
		sprite.mask = null
  		sprite.shader = null
  		sprite.texture.baseTexture.dispose()
		return sprite
	}
	releaseSprite(item) {
		// console.log('release <<<<<<<<<<<<<<', item)
		if(AppStore.Detector.oldIE) return
		this.sprites.release(item)
	}
	getSpringGarden() {
		if(AppStore.Detector.oldIE) return
		return this.springGardens.get()
	}
	releaseSpringGarden(item) {
		if(AppStore.Detector.oldIE) return
		this.springGardens.release(item)
	}
}
