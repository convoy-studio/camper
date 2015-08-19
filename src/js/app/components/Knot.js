import AppStore from 'AppStore'

export default class Knot {
	constructor(springContainer, r) {
		this.radius = r || 8
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
		
		this.g.lineStyle(AppStore.getLineWidth(), 0xffffff, 1);
		this.g.beginFill(0xffffff, 1);
		this.g.drawCircle(0, 0, this.radius);
		this.g.endFill()

		return this
	}
	position(x, y) {
		this.g.x = x
		this.g.y = y
		this.x = x
		this.y = y
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
	}
}
