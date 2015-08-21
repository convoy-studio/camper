import op from 'objectpool'
import AppStore from 'AppStore'
import SpringGarden from 'SpringGarden'

export default class Pool {
	constructor() {
		var planets = AppStore.planets()
		var pxContainerNum = 20 + (planets.length * 1)
		var graphicsNum = (planets.length * 3) - 2
		var spritesNum = planets.length
		var springGardensNum = 10

		this.timelines = op.generate(TimelineMax, { count: 6 })
		this.pxContainers = op.generate(PIXI.Container, { count: pxContainerNum })
		this.graphics = op.generate(PIXI.Graphics, { count: graphicsNum })
		this.sprites = op.generate(PIXI.Sprite, { count: spritesNum })
		this.springGardens = op.generate(SpringGarden, { count: springGardensNum })
	}
	getTimeline() {
		return this.timelines.get()
	}
	releaseTimeline(item) {
		this.timelines.release(item)
	}
	getContainer() {
		var container = this.pxContainers.get()
		container.scale.x = 1
		container.scale.y = 1
		container.position.x = 0
		container.position.y = 0
		container.skew.x = 0
		container.skew.y = 0
		container.pivot.x = 0
		container.pivot.y = 0
		container.rotation = 0
		return container
	}
	releaseContainer(item) {
		this.pxContainers.release(item)
	}
	getGraphics() {
		var g = this.graphics.get()
		g.clear()
		g.scale.x = 1
		g.scale.y = 1
		g.position.x = 0
		g.position.y = 0
		g.skew.x = 0
		g.skew.y = 0
		g.pivot.x = 0
		g.pivot.y = 0
		g.rotation = 0
		return g
	}
	releaseGraphics(item) {
		this.graphics.release(item)
	}
	getSprite() {
		return this.sprites.get()
	}
	releaseSprite(item) {
		this.sprites.release(item)
	}
	getSpringGarden() {
		return this.springGardens.get()
	}
	releaseSpringGarden(item) {
		this.springGardens.release(item)
	}
}
