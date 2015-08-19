import Knot from 'Knot'
import AppStore from 'AppStore'
import Utils from 'Utils'
import AppConstants from 'AppConstants'

export default class SpringGarden {
	constructor() {
		this.container = new PIXI.Container()
		this.outlineContainer = new PIXI.Container()
		this.filledContainer = new PIXI.Container()
		this.outlinePolygon = new PIXI.Graphics()
		this.filledPolygon = new PIXI.Graphics()
		this.outlineContainer.addChild(this.outlinePolygon)
		this.container.addChild(this.outlineContainer)
		this.filledContainer.addChild(this.filledPolygon)
		this.container.addChild(this.filledContainer)
		
		this.lineW = AppStore.getLineWidth()
		this.paused = true
		this.opened = false

		this.knots = []
		for (var i = 0; i < AppConstants.TOTAL_KNOT_NUM; i++) {
			var knot = new Knot(this.container).componentDidMount()
			this.knots[i] = knot
		}

		this.config = {
			spring: 0,
			friction: 0,
			springLength: 0
		}
	}
	componentDidMount(knots, color) {
		this.color = color

		for (var i = 0; i < this.knots.length; i++) {
			var newKnotScale = knots[i]
			var knot = this.knots[i]
			knot.toX = newKnotScale.x * (this.radius)
			knot.toY = newKnotScale.y * (this.radius)
		}
		this.container.rotation = Utils.Rand(-4, 4)
		this.config.springLength = 200
		this.assignOpenedConfig()
	}
	update() {
		this.outlinePolygon.clear()
		this.filledPolygon.clear()
		this.filledPolygon.beginFill(this.color)
		this.filledPolygon.lineStyle(0)
		this.filledPolygon.moveTo(this.knots[0].x, this.knots[0].y)
		var len = this.knots.length
		var spring = this.config.spring
		var friction = this.config.friction
		for (var i = 0; i < len; i++) {
			var knot = this.knots[i]
			var previousKnot = this.knots[i-1]
			previousKnot = (previousKnot == undefined) ? this.knots[len-1] : previousKnot

			Utils.SpringTo(knot, knot.toX, knot.toY, i, spring, friction, this.config.springLength)
			knot.position(knot.x + knot.vx, knot.y + knot.vy)

			// outline
			this.outlinePolygon.lineStyle(this.lineW, this.color, 0.8)
			this.outlinePolygon.moveTo(previousKnot.x, previousKnot.y)
			this.outlinePolygon.lineTo(knot.x, knot.y)
		}
		this.filledPolygon.endFill()
		this.config.springLength -= (this.config.springLength) * 0.1
		this.container.rotation -= (this.container.rotation) * 0.1
	}
	assignOpenedConfig() {
		this.config.spring = 0.03
		this.config.friction = 0.92
	}
	resize(radius) {
		var windowW = AppStore.Window.w
		var windowH = AppStore.Window.h
		this.radius = radius
		// this.assignToGoValues()
		this.container.x = 0
		this.container.y = 0
	}
}
