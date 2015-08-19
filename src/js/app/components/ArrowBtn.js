import Knot from 'Knot'
import AppConstants from 'AppConstants'
import Utils from 'Utils'
import AppStore from 'AppStore'

export default class ArrowBtn {
	constructor(parentContainer, direction) {
		this.parentContainer = parentContainer
		this.direction = direction
		this.isRollover = false

		this.config = {
			spring: 0,
			friction: 0,
			springLength: 0
		}
		this.config.spring = 0.03
		this.config.friction = 0.92
		this.config.springLength = 0
	}
	componentDidMount() {
		this.container = new PIXI.Container()
		this.parentContainer.addChild(this.container)
		this.lineSize = AppStore.getLineWidth()
		var radius = 3
		var margin = 30
		this.knotsLine = [
			new Knot(this.container, radius).componentDidMount(),
			new Knot(this.container, radius).componentDidMount(),
			new Knot(this.container, radius).componentDidMount()
		]
		this.knotsTriangle = [
			new Knot(this.container, radius).componentDidMount(),
			new Knot(this.container, radius).componentDidMount()
		]

		// mouseout positions
		this.knotsLine[0].position(-margin * 2, 0)
		this.knotsLine[0].fromX = -margin * 2
		this.knotsLine[1].position(-margin, 0)
		this.knotsLine[1].fromX = -margin
		this.knotsTriangle[0].position(-margin*0.6, -margin*0.7)
		this.knotsTriangle[0].fromX = -margin*0.6
		this.knotsTriangle[0].fromY = -margin*0.7
		this.knotsTriangle[1].position(-margin*0.6, margin*0.7)
		this.knotsTriangle[1].fromX = -margin*0.6
		this.knotsTriangle[1].fromY = -margin*0.7

		// mouseover positions
		this.knotsLine[0].toX = this.knotsLine[0].x - margin
		this.knotsLine[1].toX = this.knotsLine[1].x - margin
		this.knotsLine[2].toX = this.knotsLine[2].x

		this.g = new PIXI.Graphics()
		this.container.addChild(this.g)
		this.drawLines(this.g)

		switch(this.direction) {
			case AppConstants.LEFT:
				this.container.rotation = Utils.DegreesToRadians(180)
				break
			case AppConstants.RIGHT:
				break
			case AppConstants.TOP:
				this.container.rotation = Utils.DegreesToRadians(-90)
				break
			case AppConstants.BOTTOM:
				this.container.rotation = Utils.DegreesToRadians(90)
				break
		}

		this.width = margin * 3
		this.height = margin * 2
	}
	position(x, y) {
		this.container.x = x
		this.container.y = y
	}
	rollout() {
		this.updateStrings('fromX', 'fromY')
	}
	rollover() {
		this.updateStrings('toX', 'toY')
	}
	updateStrings(dirX, dirY) {
		var spring = this.config.spring
		var friction = this.config.friction
		var springLength = this.config.springLength
		var knotsLine = this.knotsLine
		for (var i = 0; i < knotsLine.length; i++) {
			var knot = knotsLine[i]
			Utils.SpringTo(knot, knot[dirX], knot[dirY], i, spring, friction, springLength)
			knot.position(knot.x + knot.vx, knot.y + knot.vy)
		}
		this.drawLines(this.g)
	}
	drawLines(g) {
		g.clear()
		g.lineStyle(this.lineSize, 0xffffff)

		g.moveTo(this.knotsLine[0].x,this.knotsLine[0].y)
		g.lineTo(this.knotsLine[1].x, this.knotsLine[1].y)
		g.lineTo(this.knotsLine[2].x, this.knotsLine[2].y)

		g.moveTo(this.knotsTriangle[0].x,this.knotsTriangle[0].y)
		g.lineTo(this.knotsLine[2].x, this.knotsLine[2].y)

		g.moveTo(this.knotsTriangle[1].x,this.knotsTriangle[1].y)
		g.lineTo(this.knotsLine[2].x, this.knotsLine[2].y)
	}
	componentWillUnmount() {
		for (var i = 0; i < this.knotsLine.length; i++) {
			this.knotsLine[i].componentWillUnmount()
		}
		for (var i = 0; i < this.knotsTriangle.length; i++) {
			this.knotsTriangle[i].componentWillUnmount()
		}
		this.container.removeChildren()
		this.parentContainer.removeChild(this.container)
	}
}
