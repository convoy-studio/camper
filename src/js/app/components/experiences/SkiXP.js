import BaseXP from 'BaseXP'
import AppStore from 'AppStore'

export default class SkiXP extends BaseXP {
	constructor(parentContainer, parentElement) {
		super(parentContainer, parentElement)
	}
	componentDidMount() {

		this.count = 0;

		this.pointsLen = 20
		this.ropeLength = 1920 / this.pointsLen;
		this.points = []

		for (var i = 0; i < this.pointsLen; i++) {
		    this.points.push(new PIXI.Point(i * this.ropeLength, 0));
		}
		var texture = PIXI.Texture.fromImage(AppStore.Preloader.getImageURL('ski-experience-bumps'))
		var strip = new PIXI.mesh.Rope(texture, this.points);

		this.bumps = [
			new PIXI.mesh.Rope(texture, this.points),
			new PIXI.mesh.Rope(texture, this.points),
			new PIXI.mesh.Rope(texture, this.points),
			new PIXI.mesh.Rope(texture, this.points),
			new PIXI.mesh.Rope(texture, this.points),
			new PIXI.mesh.Rope(texture, this.points),
		]

		this.bumpsContainer = AppStore.getContainer()
		this.pxContainer.addChild(this.bumpsContainer)

		this.setupBumps()

		super.componentDidMount()
	}
	setupBumps() {
		for (var i = 0; i < this.bumps.length; i++) {
			var bump = this.bumps[i]
			bump.y = (160 * i)
			this.bumpsContainer.addChild(bump)
		}
		this.bumps[0].x = 300
		this.bumps[1].scale.set(-1.1, 1.1)
		this.bumps[1].x = 1900
		this.bumps[2].scale.set(1.2, 1.2)
		this.bumps[3].scale.set(-1.3, 1.3)
		this.bumps[3].x = 2100
		this.bumps[4].scale.set(1.4, 1.4)
		this.bumps[4].y += 140
		this.bumps[5].scale.set(-1.6, 1.5)
		this.bumps[5].x = 2100
		this.bumps[5].y += 200
		this.bumpsContainer.x = 0
		this.bumpsContainer.y = 0
	}
	update() {

		this.count += 0.1

	    for (var i = 0; i < this.points.length; i++) {
	        this.points[i].y = Math.sin((i * 0.5) + this.count) * 40;
	        this.points[i].x = i * this.ropeLength + Math.cos((i * 0.3) + this.count) * 10;
	    }

		super.update()
	}
	resize() {
		var windowW = AppStore.Window.w
		var windowH = AppStore.Window.h
		var ratio = windowW / windowH
		if(ratio < 1.63) {
			var scale = (windowH / 900) * 0.8
		}else{
			var scale = (windowW / 1620) * 0.8
		}
		this.bumpsContainer.scale.x = scale
		this.bumpsContainer.scale.y = scale
		this.bumpsContainer.x = (windowW >> 1) - ((2100*scale) >> 1)
		this.bumpsContainer.y = (windowH >> 1) - (((200*this.bumps.length)*scale) >> 1)
		super.resize()
	}
	componentWillUnmount() {
		super.componentWillUnmount()
	}
}

