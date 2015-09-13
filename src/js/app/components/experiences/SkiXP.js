import BaseXP from 'BaseXP'
import AppStore from 'AppStore'
import BezierEasing from 'bezier-easing'
import Utils from 'Utils'
import GradientText from 'GradientText'
import particles from 'pixi-particles'
import AppConstants from 'AppConstants'

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
		this.isTitleAnimate = false
		this.elapsed = Date.now()
		this.counter = {
			vel:0.05
		}

		AppStore.Sounds.play('ski-sounds-drums', { interrupt: createjs.Sound.INTERRUPT_ANY, loop:-1 })

		for (var i = 0; i < this.pointsLen; i++) {
		    this.points.push(new PIXI.Point(i * this.ropeLength, 0));
		}
		var texture = PIXI.Texture.fromImage(AppStore.Preloader.getImageURL('ski-experience-bumps'))
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

		var gradientTextA = new GradientText(this.pxContainer)
		gradientTextA.componentDidMount({fontFamily:'Mechsuit', fontSize:90, strokeThickness:14})
		var gradientTextB = new GradientText(this.pxContainer)
		gradientTextB.componentDidMount({fontFamily:'Paladins', fontSize:120, strokeThickness:14})
		var gradientTextC = new GradientText(this.pxContainer)
		gradientTextC.componentDidMount({fontFamily:'Skirmisher', fontSize:150, strokeThickness:14})

		this.gradientTextIndex = 0
		this.gradientTexts = [
			gradientTextA, 
			gradientTextB,
			gradientTextC
		]
		for (var i = 0; i < this.gradientTexts.length; i++) {
			var gradientTxt = this.gradientTexts[i]
			gradientTxt.container.alpha = 0
		};

		var style = {
		    font: '22px FuturaBold',
		    fill: 'white',
		};

		this.gameStatus = {
			textField: new PIXI.Text("SCORE: 1000 PTS", style),
			pointTextField: new PIXI.Text("+150 pts", style),
			counter: 0,
			score: 0,
			time: 0
		}

		this.pxContainer.addChild(this.gameStatus.textField)
		this.pxContainer.addChild(this.gameStatus.pointTextField)
		this.gameStatus.textField.anchor.x = this.gameStatus.textField.anchor.y = 0.5
		this.gameStatus.pointTextField.anchor.x = this.gameStatus.pointTextField.anchor.y = 0.5
		this.gameStatus.pointTextField.scale.x = this.gameStatus.pointTextField.scale.y = 0

		this.particleContainer = AppStore.getContainer()
		this.emitter = new cloudkid.Emitter(
		  this.particleContainer,
		  [
			PIXI.Texture.fromImage(AppStore.Preloader.getImageURL('ski-experience-shoe-0')),
			PIXI.Texture.fromImage(AppStore.Preloader.getImageURL('ski-experience-shoe-1')),
			PIXI.Texture.fromImage(AppStore.Preloader.getImageURL('ski-experience-shoe-2')),
			PIXI.Texture.fromImage(AppStore.Preloader.getImageURL('ski-experience-shoe-3'))
		  ],
		    {
		         "alpha": {
					"start": 1,
					"end": 1
				},
				"scale": {
					"start": 0.1,
					"end": 1.4
				},
				"color": {
					"start": "ffffff",
					"end": "9ff3ff"
				},
				"speed": {
					"start":400,
					"end": 100
				},
				"acceleration": {
					"x":0,
					"y":400
				},
				"startRotation": {
					"min":280,
					"max": 260
				},
				"rotationSpeed": {
					"min": 0,
					"max": 0
				},
				"lifetime": {
					"min": 5,
					"max": 8
				},
				"blendMode": "normal",
				"frequency": 0.6,
				"emitterLifetime": 0,
				"maxParticles": 100,
				"pos": {
					"x": 0,
					"y": 0
				},
				"addAtBack": true,
				"spawnType": "circle",
				"spawnCircle": {
					"x": 0,
					"y": 0,
					"r": 700
				}
		    }
		)

		this.setupBumps()

		this.pxContainer.addChild(this.particleContainer)

		this.emitter.emit = true

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
		var scale = Utils.Rand(0.01, 0.02)
		bump.counter = 0
		this.gameStatus.lastScore = this.gameStatus.score

		this.gameStatus.textField.text = 'SCORE: ' + this.gameStatus.score + ' pts'
		this.gameStatus.score += Math.round(Utils.Rand(1, 100))

		if(this.isTitleAnimate) return

		var randIndex = Utils.Rand(0, 1, 0)
		var soundId = 'ski-sounds-bump-' + randIndex
		AppStore.Sounds.play(soundId)

		this.gameStatus.counter += 1
		if(this.gameStatus.counter > 10) {
			this.currentGradientText = this.getGradientText()
			this.currentGradientText.setText()
			this.resizeGradientTexts()

			AppStore.Sounds.play('ski-sounds-text-in-0')

			this.gameStatus.pointTextField.text = Math.round(Math.random() * 300) + ' pts'

			this.gameStatus.pointTextField.x = AppStore.Mouse.x
			this.gameStatus.pointTextField.y = AppStore.Mouse.y
			this.gameStatus.pointTextField.alpha = 1

			var randIndex = Utils.Rand(0, 1, 0)
			var soundId = 'ski-sounds-flying-' + randIndex
			AppStore.Sounds.play(soundId)

			TweenMax.fromTo(this.gameStatus.pointTextField.scale, 0.6, {x:0, y:2}, { x:1.4, y:1.4, ease:Elastic.easeOut })
			TweenMax.to(this.gameStatus.pointTextField, 1, { y:-100, alpha:0, ease:Linear.easeOut })

			TweenMax.fromTo(this.gameStatus.textField.scale, 0.6, {x:0, y:2}, { x:1.4, y:1.4, ease:Elastic.easeOut })
			TweenMax.to(this.gameStatus.textField.scale, 0.8, { delay:0.8, x:1, y:1, ease:Expo.easeOut })
			TweenMax.fromTo(this.currentGradientText.container.scale, 0.4, { x:0, y:0 }, { x:this.currentGradientText.scale-0.5, y:this.currentGradientText.scale-0.5, ease:Elastic.easeOut })
			TweenMax.to(this.currentGradientText.container.scale, 0.4, { delay:0.2, x:this.currentGradientText.scale, y:this.currentGradientText.scale, ease:Elastic.easeOut })
			TweenMax.fromTo(this.currentGradientText.container, 0.4, { alpha:0 }, { alpha:1, ease:Elastic.easeOut })
			this.currentGradientText.toggle()
			this.isTitleAnimate = true
			TweenMax.to(this.counter, 0.4, { vel:0.3, ease:Elastic.easeOut })
			setTimeout(()=>{
				TweenMax.to(this.currentGradientText.container.scale, 0.6, { x:this.currentGradientText.scale + 2, y:this.currentGradientText.scale + 0.1, ease:Expo.easeInOut })
				TweenMax.to(this.currentGradientText.container, 0.6, { alpha:0, ease:Expo.easeInOut })
			}, 1600)
			setTimeout(()=>{
				this.isTitleAnimate = false
				TweenMax.to(this.counter, 0.5, { vel:0.02, ease:Expo.easeInOut })
			}, 2000)
			this.gameStatus.counter = 0
		}
	}
	getGradientText() {
		this.gradientTextIndex += 1
		this.gradientTextIndex = (this.gradientTextIndex > this.gradientTexts.length-1) ? 0 : this.gradientTextIndex
		this.gradientTextIndex = (this.gradientTextIndex < 0) ? this.gradientTexts.length-1 : this.gradientTextIndex
		return this.gradientTexts[this.gradientTextIndex]
	}
	update() {
		this.count += this.counter.vel

		if(this.currentGradientText != undefined) {
			this.currentGradientText.update()
		}

		var now = Date.now()
		this.emitter.update((now - this.elapsed) * 0.001)
    	this.elapsed = now

	    for (var i = 0; i < this.points.length; i++) {
	        this.points[i].x = i * this.ropeLength + Math.cos((i * 0.3) + this.count) * 10;
	        this.points[i].y = Math.sin((i * 0.5) + this.count) * 40;
	    }
		super.update()
	}
	resizeGradientTexts() {
		var windowW = AppStore.Window.w
		var windowH = AppStore.Window.h
		for (var i = 0; i < this.gradientTexts.length; i++) {
			var gradientText = this.gradientTexts[i]
			gradientText.resize()
			gradientText.position(
				(windowW >> 1),
				(windowH >> 1)
			)
		}
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

		this.particleContainer.x = (windowW >> 1)
		this.particleContainer.y = (windowH >> 1)

		this.gameStatus.textField.x = windowW >> 1
		this.gameStatus.textField.y = AppConstants.PADDING_AROUND + (this.gameStatus.textField.height >> 1)

		this.resizeGradientTexts()

		super.resize()
	}
	componentWillUnmount() {

		this.bumpsContainer.removeChildren()
		AppStore.releaseContainer(this.bumpsContainer)

		this.particleContainer.removeChildren()
		AppStore.releaseContainer(this.particleContainer)

		for (var i = 0; i < this.gradientTexts.length; i++) {
			var gradientTxt = this.gradientTexts[i]
			gradientTxt.componentWillUnmount()
		};

		this.emitter.destroy()

		super.componentWillUnmount()
	}
}

