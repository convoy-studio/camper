import Knot from 'Knot'
import AppStore from 'AppStore'
import Utils from 'Utils'
import AppConstants from 'AppConstants'
import Router from 'Router'

export default class SpringGarden {
	constructor() {
		this.container = new PIXI.Container()
		this.areaPolygonContainer = new PIXI.Container()
		this.areaPolygon = new PIXI.Graphics()
		this.areaPolygonContainer.addChild(this.areaPolygon)
		this.container.addChild(this.areaPolygonContainer)
		
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
	componentDidMount(data, type) {
		this.params = data
		type = type || AppConstants.LANDING
		this.color = (type == AppConstants.LANDING) || this.params.highlight == false ? 0xffffff : this.params.color
		this.color = this.params.color
		if(this.params.highlight != undefined && type != AppConstants.LANDING) {
			this.color = this.params.highlight == false ? 0xffffff : this.color
		}
		var knotsData = this.params.knots
		for (var i = 0; i < this.knots.length; i++) {
			var newKnotScale = knotsData[i]
			var knot = this.knots[i]
			knot.changeSize(this.knotRadius)
			knot.toX = newKnotScale.x * (this.radius)
			knot.toY = newKnotScale.y * (this.radius)
		}
		this.container.rotation = Utils.Rand(-4, 4)
		this.config.springLength = 200
		this.assignOpenedConfig()
	}
	update() {
		this.areaPolygon.clear()
		this.areaPolygon.lineStyle(this.lineW, this.color, 0.8)
		var len = this.knots.length
		var spring = this.config.spring
		var friction = this.config.friction
		for (var i = 0; i < len; i++) {
			var knot = this.knots[i]
			var previousKnot = this.knots[i-1]
			previousKnot = (previousKnot == undefined) ? this.knots[len-1] : previousKnot

			Utils.SpringTo(knot, knot.toX, knot.toY, i, spring, friction, this.config.springLength)
			knot.position(knot.x + knot.vx, knot.y + knot.vy)

			this.areaPolygon.moveTo(previousKnot.x, previousKnot.y)
			this.areaPolygon.lineTo(knot.x, knot.y)
		}
		this.config.springLength -= (this.config.springLength) * 0.1
		this.container.rotation -= (this.container.rotation) * 0.1
	}
	assignOpenedConfig() {
		this.config.spring = 0.03
		this.config.friction = 0.92
	}
	clear() {
		for (var i = 0; i < this.knots.length; i++) {
			var knot = this.knots[i]
			knot.clear()
		}
		this.areaPolygon.clear()
	}
	componentWillUnmount() {
	}
	resize(radius) {
		var windowW = AppStore.Window.w
		var windowH = AppStore.Window.h
		this.radius = radius
		this.container.x = 0
		this.container.y = 0
	}
}
