import AppStore from 'AppStore'

export default class Knot {
	constructor(springContainer, r, color) {
		this.radius = r || 3
		this.color = color || 0xffffff
		this.springContainer = springContainer
		this.vx = 0
		this.vy = 0
		this.x = 0
		this.y = 0
		this.toX = 0
		this.toY = 0
		this.fromX = 0
		this.fromY = 0
		this.scaleX = 1
		this.scaleY = 1
	}
	componentDidMount() {
		this.g = new PIXI.Graphics()
		this.springContainer.addChild(this.g)
		this.draw()
		return this
	}
	changeSize(radius) {
		this.radius = radius || 3
		this.draw()
	}
	draw() {
		this.g.clear()
		this.g.lineStyle(AppStore.getLineWidth(), this.color, 1);
		this.g.beginFill(this.color, 1);
		this.g.drawCircle(0, 0, this.radius);
		this.g.endFill()	
	}
	position(x, y) {
		this.g.x = x
		this.g.y = y
		this.x = x
		this.y = y
	}
	clear() {
		this.g.clear()
	}
	scale(x, y) {
		this.g.scale.x = x
		this.g.scale.y = y
		this.scaleX = x
		this.scaleY = y
	}
	velocity(x, y) {
		this.vx = x
		this.vy = y
	}
	componentWillUnmount() {
		this.g.clear()
		this.g = null
	}
}
