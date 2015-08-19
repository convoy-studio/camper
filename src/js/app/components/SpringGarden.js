import Knot from 'Knot'
import AppStore from 'AppStore'
import Utils from 'Utils'

export default class SpringGarden {
	constructor(pxContainer, garden, color) {
		this.pxContainer = pxContainer
		this.garden = garden
		this.color = color
		this.lineW = AppStore.getLineWidth()
		this.paused = true
		this.opened = false

		this.config = {
			spring: 0,
			friction: 0,
			springLength: 0
		}
	}
	componentDidMount() {
		this.container = new PIXI.Container()
		this.pxContainer.addChild(this.container)
		
		this.outlineContainer = new PIXI.Container()
		this.outlinePolygon = new PIXI.Graphics()
		this.outlineContainer.addChild(this.outlinePolygon)
		this.container.addChild(this.outlineContainer)

		this.filledContainer = new PIXI.Container()
		this.filledPolygon = new PIXI.Graphics()
		this.filledContainer.addChild(this.filledPolygon)
		this.container.addChild(this.filledContainer)

		for (var i = 0; i < this.garden.length; i++) {
			var knot = this.garden[i]
			knot.k = new Knot(this.container).componentDidMount()
		}
	}
	update() {
		if(this.paused) return
		this.outlinePolygon.clear()
		this.filledPolygon.clear()
		this.filledPolygon.beginFill(this.color)
		this.filledPolygon.lineStyle(0)
		this.filledPolygon.moveTo(this.garden[0].k.x, this.garden[0].k.y)
		var len = this.garden.length
		var spring = this.config.spring
		var friction = this.config.friction
		var springLength = this.config.springLength
		for (var i = 0; i < len; i++) {
			var knot = this.garden[i]
			var knotK = knot.k
			var previousKnot = this.garden[i-1]
			previousKnot = (previousKnot == undefined) ? this.garden[len-1] : previousKnot

			Utils.SpringTo(knotK, knot.toX, knot.toY, i, spring, friction, springLength)
			knotK.position(knotK.x + knotK.vx, knotK.y + knotK.vy)

			// outline
			this.outlinePolygon.lineStyle(this.lineW, this.color, 0.8)
			this.outlinePolygon.moveTo(previousKnot.k.x, previousKnot.k.y)
			this.outlinePolygon.lineTo(knotK.x, knotK.y)

			// this.filledPolygon.lineTo(knot.k.x, knot.k.y)
		}
		this.filledPolygon.endFill()
		springLength -= (springLength) * 0.1
		this.container.rotation -= (this.container.rotation) * 0.1
		// if(this.config.springLength < 0.0001) {
		// 	this.paused = true
		// }
	}
	open() {
		for (var i = 0; i < this.garden.length; i++) {
			var knot = this.garden[i]
			knot.k.position(0, 0)
		}
		this.container.rotation = Utils.Rand(-2, 2)
		this.config.springLength = 200
		this.paused = false
		this.opened = true
		this.assignToGoValues()
		this.assignOpenedConfig()
	}
	close() {
		this.opened = false
		this.assignToGoValues()
		this.assignClosedConfig()
	}
	getToX(knot) {
		if(this.opened) return knot.x * (this.radius)
		else return 0
	}
	getToY(knot) {
		if(this.opened) return knot.y * (this.radius)
		else return 0
	}
	assignToGoValues() {
		for (var i = 0; i < this.garden.length; i++) {
			var knot = this.garden[i]
			knot.toX = this.getToX(knot)
			knot.toY = this.getToY(knot)
		}
	}
	assignOpenedConfig() {
		this.config.spring = 0.03
		this.config.friction = 0.92
		this.config.springLength = 0
	}
	assignClosedConfig() {
		this.config.spring = 10
		this.config.friction = 0.1
		this.config.springLength = 0
	}
	resize(radius) {
		var windowW = AppStore.Window.w
		var windowH = AppStore.Window.h
		this.radius = radius
		this.assignToGoValues()
		this.container.x = 0
		this.container.y = 0
	}
}
