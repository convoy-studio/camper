import op from 'objectpool'
import AppStore from 'AppStore'

export default class Pool {
	constructor() {
		var planets = AppStore.planets()
		var pxContainerNum = 5 + (planets.length * 1)
		var graphicsNum = planets.length
		var spritesNum = planets.length

		this.timelines = op.generate(TimelineMax, { count: 4 })
		this.pxContainers = op.generate(PIXI.Container, { count: pxContainerNum })
		this.graphics = op.generate(PIXI.Graphics, { count: graphicsNum })
		this.sprites = op.generate(PIXI.Sprite, { count: spritesNum })
	}
	getTimeline() {
		return this.timelines.get()
	}
	releaseTimeline(item) {
		this.timelines.release(item)
	}
	getContainer() {
		return this.pxContainers.get()
	}
	releaseContainer(item) {
		this.pxContainers.release(item)
	}
	getGraphics() {
		return this.graphics.get()
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
}
