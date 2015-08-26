import AppStore from 'AppStore'
import AppConstants from 'AppConstants'
import Knot from 'Knot'
import Utils from 'Utils'
import Vec2 from 'Vec2'
import Router from 'Router'

export default class SmallCompass {
	constructor(pxContainer, type) {
		this.pxContainer = pxContainer
		this.type = type || AppConstants.LANDING
		this.bounce = -1
	}
	componentDidMount(data, name, parentEl, planetTxt) {
		this.parentEl = parentEl
		this.container = AppStore.getContainer()
		this.pxContainer.addChild(this.container)

		this.bgCircle = new PIXI.Graphics()
		this.container.addChild(this.bgCircle)

		var knotRadius = AppConstants.SMALL_KNOT_RADIUS
		this.radius = 30
		this.radiusLimit = (this.radius*0.8) - (knotRadius>>1)
		this.width = this.radius
		this.height = this.radius

		var compassName = planetTxt.toUpperCase() + ' ' + name.toUpperCase()
		this.element = this.parentEl.find('.compasses-texts-wrapper')
		var containerEl = $('<div class="texts-container btn"></div>')
		this.element.append(containerEl)
		var titleTop = $('<div class="top-title"></div')

		this.circleRad = 90
		var circlepath = 'M0,'+this.circleRad/2+'a'+this.circleRad/2+','+this.circleRad/2+' 0 1,0 '+this.circleRad+',0a'+this.circleRad/2+','+this.circleRad/2+' 0 1,0 -'+this.circleRad+',0'
		var svgStr = '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"> <defs> <path id="path1" d="'+circlepath+'" > </path> </defs> <text fill="white" id="myText"> <textPath xlink:href="#path1"> <tspan dx="0px" dy="0px">' + compassName + '</tspan> </textPath> </text></svg>'
		var titleTopSvg = $(svgStr)
		titleTop.append(titleTopSvg)
		containerEl.append(titleTop)
		titleTopSvg.css({
			width: this.circleRad,
			height: this.circleRad
		})
		this.titles = {
			container: containerEl,
			$titleTop: titleTop,
			titleTop: titleTop.get(0),
			rotation: 0,
		}

		this.onClicked = this.onClicked.bind(this)
		this.titles.container.on('click', this.onClicked)

		this.knots = []
		for (var i = 0; i < data.length; i++) {
			var d = data[i]
			var knot = new Knot(this.container, knotRadius, 0xffffff).componentDidMount()
			knot.mass = knotRadius
			knot.vx = Math.random() * 0.8
            knot.vy = Math.random() * 0.8
            knot.posVec = new PIXI.Point(0, 0)
            knot.posFVec = new PIXI.Point(0, 0)
            knot.velVec = new PIXI.Point(0, 0)
            knot.velFVec = new PIXI.Point(0, 0)
			knot.position(Utils.Rand(-this.radiusLimit, this.radiusLimit), Utils.Rand(-this.radiusLimit, this.radiusLimit))
			this.knots[i] = knot
		}

		var lineW = AppStore.getLineWidth()
		// draw a rectangle
		this.bgCircle.clear()
		this.bgCircle.lineStyle(lineW, 0xffffff, 1)
		this.bgCircle.beginFill(0xffffff, 0)
		this.bgCircle.drawCircle(0, 0, this.radius)
	}
	onClicked(e) {
		e.preventDefault()
		var url = "/planet/" + this.id + "/0"
		Router.setHash(url)
	}
	checkWalls(knot) {
		if(knot.x + knot.radius > this.radiusLimit) {
	        knot.x = this.radiusLimit - knot.radius;
	        knot.vx *= this.bounce;
	    }else if(knot.x - knot.radius < -this.radiusLimit-knot.radius) {
	        knot.x = -this.radiusLimit + knot.radius-knot.radius;
	        knot.vx *= this.bounce;
	    }
	    if(knot.y + knot.radius > this.radiusLimit) {
	        knot.y = this.radiusLimit - knot.radius;
	        knot.vy *= this.bounce;
	    }else if(knot.y - knot.radius < -this.radiusLimit) {
	        knot.y = -this.radiusLimit + knot.radius;
	        knot.vy *= this.bounce;
	    }
	}
	checkCollision(knotA, knotB) {
		var dx = knotB.x - knotA.x;
	    var dy = knotB.y - knotA.y;
	    var dist = Math.sqrt(dx*dx + dy*dy);
	    if(dist < knotA.radius + knotB.radius) {
	        var angle = Math.atan2(dy, dx)
	        var sin = Math.sin(angle)
	        var cos = Math.cos(angle)
	        knotA.posVec.x = 0
	        knotA.posVec.y = 0
	        this.rotate(knotB.posVec, dx, dy, sin, cos, true)
	        this.rotate(knotA.velVec, knotA.vx, knotA.vy, sin, cos, true)
	        this.rotate(knotB.velVec, knotB.vx, knotB.vy, sin, cos, true)

	        // collision reaction
			var vxTotal = knotA.velVec.x - knotB.velVec.x
			knotA.velVec.x = ((knotA.mass - knotB.mass) * knotA.velVec.x + 2 * knotB.mass * knotB.velVec.x) / (knotA.mass + knotB.mass)
			knotB.velVec.x = vxTotal + knotA.velVec.x

			// update position
			knotA.posVec.x += knotA.velVec.x;
			knotB.posVec.x += knotB.velVec.x;

			// rotate positions back
			this.rotate(knotA.posFVec, knotA.posVec.x, knotA.posVec.y, sin, cos, false)
			this.rotate(knotB.posFVec, knotB.posVec.x, knotB.posVec.y, sin, cos, false)

			// adjust positions to actual screen positions
			knotB.x = knotA.x + knotB.posFVec.x;
			knotB.y = knotA.y + knotB.posFVec.y;
			knotA.x = knotA.x + knotA.posFVec.x;
			knotA.y = knotA.y + knotA.posFVec.y;

			// rotate velocities back
			this.rotate(knotA.velFVec, knotA.velVec.x, knotA.velVec.y, sin, cos, false)
			this.rotate(knotB.velFVec, knotB.velVec.x, knotB.velVec.y, sin, cos, false)

			knotA.vx = knotA.velFVec.x;
	        knotA.vy = knotA.velFVec.y;
	        knotB.vx = knotB.velFVec.x;
	        knotB.vy = knotB.velFVec.y;
	    }
	}
	rotate(point, x, y, sin, cos, reverse) {
		if(reverse) {
			point.x = x * cos + y * sin;
			point.y = y * cos - x * sin;
		}else{
			point.x = x * cos - y * sin;
			point.y = y * cos + x * sin;
		}
	}
	didTransitionInComplete() {
		// this.titles.container.addClass('active')
	}
	willTransitionOut() {
		// this.titles.container.removeClass('active')	
	}
	update() {
		var knots = this.knots
		var knotsNum = knots.length
		for (var i = 0; i < knotsNum; i++) {
			var knot = knots[i]
			knot.position(knot.x + knot.vx, knot.y + knot.vy)
			this.checkWalls(knot)
		}
		for (i = 0; i < knotsNum - 1; i++) {
			var knotA = knots[i]
			for (var j = i + 1; j < knotsNum; j++) {
				var knotB = knots[j]
				this.checkCollision(knotA, knotB)
			}
		}
		this.titles.rotation += 0.2
		this.rotateEl(this.titles.titleTop, this.titles.rotation)
	}
	resize() {
		var windowH = AppStore.Window.h
	}
	rotateEl(div, deg) {
		Utils.Style(div, 'rotate('+deg+'deg)')
	}
	position(x, y) {
		this.container.x = x
		this.container.y = y
		this.x = x
		this.y = y
	}
	opacity(val) {
		this.container.alpha = val
		this.titles.$titleTop.css('opacity', val)
	}
	positionElement(x, y) {
		this.titles.container.css({
			left: x - (this.circleRad>>1),
			top: y - (this.circleRad>>1),
			width: this.circleRad,
			height: this.circleRad,
		})
	}
	componentWillUnmount() {
		for (var i = 0; i < this.knots.length; i++) {
			this.knots[i].componentWillUnmount()
		}
		this.titles.container.off('click', this.onClicked)
		this.knots.length = 0
		this.bgCircle.clear()
		this.bgCircle = null
		this.container.removeChildren()
		AppStore.releaseContainer(this.container)
	}
}
