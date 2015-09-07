import BaseXP from 'BaseXP'
import AppStore from 'AppStore'
import BezierEasing from 'bezier-easing'
import Utils from 'Utils'

export default class SkiXP extends BaseXP {
	constructor(parentContainer, parentElement) {
		super(parentContainer, parentElement)
	}
	componentDidMount() {
		this.onBumpOver = this.onBumpOver.bind(this)
		this.count = 0;
		this.pointsLen = 20
		this.ropeLength = 1920 / this.pointsLen;
		this.points = []

		for (var i = 0; i < this.pointsLen; i++) {
		    this.points.push(new PIXI.Point(i * this.ropeLength, 0));
		}
		var texture = PIXI.Texture.fromImage(AppStore.Preloader.getImageURL('ski-experience-bumps'))
		var strip = new PIXI.mesh.Rope(texture, this.points);

		this.bumps = []
		for (var i = 0; i < 6; i++) {
			this.bumps.push({
				counter: 0,
				ease: BezierEasing(1,.04,0,1),
				rope: new PIXI.mesh.Rope(texture, this.points)
			})
		};
		this.bumpsContainer = AppStore.getContainer()
		this.pxContainer.addChild(this.bumpsContainer)

		var style = {
		    font : 'bold italic 36px Mechsuit',
		    fill : '#F7EDCA',
		    stroke : '#4a1850',
		    strokeThickness : 5,
		    dropShadow : true,
		    dropShadowColor : '#000000',
		    dropShadowAngle : Math.PI / 6,
		    dropShadowDistance : 6,
		    wordWrap : true,
		    wordWrapWidth : 440
		};

		var richText = new PIXI.Text('Rich text with a lot of options and across multiple lines'.toUpperCase(),style);
		richText.x = 30;
		richText.y = 180;
		this.pxContainer.addChild(richText)
		console.log(richText.width)

		setTimeout(()=>{
			richText.text = "hello".toUpperCase()
			console.log(richText.width)

		}, 2000);

		this.setupBumps()

		super.componentDidMount()
	}
	setupBumps() {
		for (var i = 0; i < this.bumps.length; i++) {
			var bump = this.bumps[i]
			var rope = bump.rope
			rope.y = (160 * i)
			rope.buttonMode = true
			rope.interactive = true
			rope.id = 'bump_' + i
			rope.on('mouseover', this.onBumpOver)
			this.bumpsContainer.addChild(rope)
		}
		this.bumps[0].rope.x = 300
		this.bumps[1].rope.scale.set(-1.1, 1.1)
		this.bumps[1].rope.x = 1900
		this.bumps[2].rope.scale.set(1.2, 1.2)
		this.bumps[3].rope.scale.set(-1.3, 1.3)
		this.bumps[3].rope.x = 2100
		this.bumps[4].rope.scale.set(1.4, 1.4)
		this.bumps[4].rope.y += 140
		this.bumps[5].rope.scale.set(-1.6, 1.5)
		this.bumps[5].rope.x = 2100
		this.bumps[5].rope.y += 200

		for (var i = 0; i < this.bumps.length; i++) {
			var bump = this.bumps[i]
			var rope = bump.rope
			bump.scaleX = rope.scale.x
			bump.scaleY = rope.scale.y
			bump.scaleInitialX = rope.scale.x
			bump.scaleInitialY = rope.scale.y
		};

		this.bumpsContainer.x = 0
		this.bumpsContainer.y = 0
	}
	onBumpOver(e) {
		var target = e.target
		var id = target.id
		var index = Math.round(id.replace('bump_', ''))
		var bump = this.bumps[index]
		var scale = Utils.Rand(0.1, 0.2)
		bump.rope.scale.x = (bump.scaleInitialX < 0) ? (bump.scaleInitialX - scale) : (bump.scaleInitialX + scale)
		bump.rope.scale.y = bump.scaleInitialY + scale
		bump.counter = 0
	}
	update() {
		this.count += 0.1

	    for (var i = 0; i < this.points.length; i++) {
	        this.points[i].x = i * this.ropeLength + Math.cos((i * 0.3) + this.count) * 10;
	        this.points[i].y = Math.sin((i * 0.5) + this.count) * 40;
	    }
	    for (var i = 0; i < this.bumps.length; i++) {
	    	var bump = this.bumps[i]
	    	bump.counter += (1 - bump.counter) * 0.1
	    	var ease = bump.ease.get(bump.counter)
	    	if(bump.scaleInitialX > 0) {
	    		bump.rope.scale.x += (bump.scaleInitialX - bump.rope.scale.x) * ease
	    	}else{
	    		bump.rope.scale.x -= (bump.rope.scale.x - bump.scaleInitialX) * ease
	    	}
	    	bump.rope.scale.y += (bump.scaleInitialY - bump.rope.scale.y) * ease
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

