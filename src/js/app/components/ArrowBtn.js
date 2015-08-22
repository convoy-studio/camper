import Knot from 'Knot'
import AppConstants from 'AppConstants'
import Utils from 'Utils'
import AppStore from 'AppStore'

export default class ArrowBtn {
	constructor(element, direction) {
		this.element = element
		this.direction = direction
	}
	componentDidMount() {
		this.tlOver = AppStore.getTimeline()
		this.tlOut = AppStore.getTimeline()
		var knotsEl = this.element.find(".knot")
		var linesEl = this.element.find(".line")
		// TweenMax.to(knotsEl, 1, { scale:2, transformOrigin:'50% 50%' })

		this.lineSize = AppStore.getLineWidth()
		var radius = 3
		var margin = 30

		for (var i = 0; i < knotsEl.length; i++) {
			var knot = $(knotsEl[i])
			knot.attr('r', radius)
		};
		for (var i = 0; i < linesEl.length; i++) {
			var line = $(linesEl[i])
			line.css('stroke-width', this.lineSize)
		};

		var startX = 4
		var startY = margin
		var offsetUpDown = 0.6
		$(knotsEl.get(0)).attr({
			'cx': startX + 0,
			'cy': startY + 0
		})
		$(knotsEl.get(1)).attr({
			'cx': startX + margin,
			'cy': startY + 0
		})
		$(knotsEl.get(2)).attr({
			'cx': startX + (margin*2),
			'cy': startY + 0
		})
		$(knotsEl.get(3)).attr({
			'cx': startX + (margin * offsetUpDown),
			'cy': startY - (margin * offsetUpDown)
		})
		$(knotsEl.get(4)).attr({
			'cx': startX + (margin * offsetUpDown),
			'cy': startY + (margin * offsetUpDown)
		})
		$(linesEl.get(0)).attr({
			'x1': startX + 0,
			'y1': startY + 0,
			'x2': startX + margin,
			'y2': startY + 0
		})
		$(linesEl.get(1)).attr({
			'x1': startX + margin,
			'y1': startY + 0,
			'x2': startX + (margin*2),
			'y2': startY + 0
		})
		$(linesEl.get(2)).attr({
			'x1': startX + 0,
			'y1': startY + 0,
			'x2': startX + (margin * offsetUpDown),
			'y2': startY - (margin * offsetUpDown)
		})
		$(linesEl.get(3)).attr({
			'x1': startX + 0,
			'y1': startY + 0,
			'x2': startX + (margin * offsetUpDown),
			'y2': startY + (margin * offsetUpDown)
		})

		this.tlOver.to(knotsEl[0], 1, { x:-6, force3D:true, ease:Elastic.easeInOut }, 0)
		this.tlOver.to(knotsEl[1], 1, { x:-6, force3D:true, ease:Elastic.easeInOut }, 0)
		this.tlOver.to(knotsEl[2], 1, { x:-6, force3D:true, ease:Elastic.easeInOut }, 0)
		// this.tlOver.to(knotsEl[3], 1, { x:6, force3D:true, ease:Elastic.easeInOut }, 0)
		// this.tlOver.to(knotsEl[4], 1, { x:6, force3D:true, ease:Elastic.easeInOut }, 0)
		
		// this.tlOver.to(linesEl[0], 1, { scaleX:1.1, force3D:true, transformOrigin:'0% 100%', ease:Elastic.easeInOut }, 0)

		switch(this.direction) {
			case AppConstants.LEFT:
				// this.container.rotation = Utils.DegreesToRadians(180)
				break
			case AppConstants.RIGHT:
				break
			case AppConstants.TOP:
				// this.container.rotation = Utils.DegreesToRadians(-90)
				break
			case AppConstants.BOTTOM:
				// this.container.rotation = Utils.DegreesToRadians(90)
				break
		}

		this.tlOver.pause(0)

		this.rollover = this.rollover.bind(this)
		this.element.on('mouseenter', this.rollover)
		console.log(this.element)

		this.width = margin * 3
		this.height = margin * 2
	}
	position(x, y) {
		this.container.x = x
		this.container.y = y
	}
	rollout() {
		// this.updateStrings('fromX', 'fromY')
	}
	rollover() {
		console.log('over')
		this.tlOver.play(0)
		// this.updateStrings('toX', 'toY')
	}
	updateStrings(dirX, dirY) {
		var spring = this.config.spring
		var friction = this.config.friction
		var springLength = this.config.springLength
		var knotsLine = this.knotsLine
		var knotsTriangle = this.knotsTriangle
		for (var i = 0; i < knotsLine.length; i++) {
			var knot = knotsLine[i]
			Utils.SpringTo(knot, knot[dirX], knot[dirY], i, spring, friction, springLength)
			knot.position(knot.x + knot.vx, knot.y + knot.vy)
		}
		for (i = 0; i < knotsTriangle.length; i++) {
			var knot = knotsTriangle[i]
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
		AppStore.releaseTimeline(this.tlOver)
		AppStore.releaseTimeline(this.tlOut)
	}
}
