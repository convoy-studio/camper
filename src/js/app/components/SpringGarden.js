import Knot from 'Knot'
import AppStore from 'AppStore'
import Utils from 'Utils'

export default class SpringGarden {
	constructor(pxContainer) {
		this.pxContainer = pxContainer

		this.config = {
			spring: 0.1,
			friction: 0.1,
			springLength: 100
		}
	}
	componentDidMount() {
		this.container = new PIXI.Container()
		this.pxContainer.addChild(this.container)

		this.knots = [
			new Knot(this.container).componentDidMount(),
			new Knot(this.container).componentDidMount(),
			new Knot(this.container).componentDidMount()
		]

		for (var i = 0; i < this.knots.length; i++) {
			var knot = this.knots[i]
			knot.position(Utils.Rand(-500, 500), Utils.Rand(-500, 500))
		}
	}
	update() {
		for (var i = 0; i < this.knots.length; i++) {
			var knotA = this.knots[i]
			for (var j = i; j < this.knots.length; j++) {
				var knotB = this.knots[j]
				this.springTo(knotA, knotB)
			}
		}
	}
	springTo(knotA, knotB) {
		var dx = knotB.x - knotA.x;
    	var dy = knotB.y - knotA.y;
		var angle = Math.atan2(dy, dx);
		var targetX = knotB.x - Math.cos(angle) * this.config.springLength;
		var targetY = knotB.y - Math.sin(angle) * this.config.springLength;
		knotA.vx += (targetX - knotA.x) * this.config.spring;
		knotA.vy += (targetY - knotA.y) * this.config.spring;
		knotA.vx *= this.config.friction;
		knotA.vy *= this.config.friction;
		knotA.position(knotA.x + knotA.vx, knotA.y + knotA.vy)
	}
	resize() {
		var windowW = AppStore.Window.w
		var windowH = AppStore.Window.h
		this.container.x = windowW >> 1
		this.container.y = windowH >> 1
	}
}
