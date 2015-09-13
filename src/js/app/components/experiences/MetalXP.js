import BaseXP from 'BaseXP'
import AppStore from 'AppStore'
import Utils from 'Utils'
const glslify = require('glslify')

export default class MetalXP extends BaseXP {
	constructor(parentContainer, parentElement) {
		super(parentContainer, parentElement)
	}
	componentDidMount() {

		var texture = PIXI.Texture.fromVideo(AppStore.baseMediaPath() + 'image/planets/metal/experience-assets/bg-video/metal_L.' + AppStore.videoExtensionSupport())
		this.video = $(texture.baseTexture.source)
		this.video.attr('loop', true)
		this.videoSprite = AppStore.getSprite()
		this.videoSprite.texture = texture
		this.pxContainer.addChild(this.videoSprite)

		var Engine = Matter.Engine,
		    World = Matter.World,
		    Body = Matter.Body,
		    Composites = Matter.Composites,
		    MouseConstraint = Matter.MouseConstraint;

		this.engine = Engine.create(this.element.get(0), {
		  render: {
		    options: {
		      showAngleIndicator: false,
		      showVelocity: false,
		      background: 'transparent',
		      wireframes: false
		    }
		  }
		})

		AppStore.Sounds.play('metal-sounds-overall-0')

		this.matterCanvas = this.element.find('canvas')

		var mouseConstraint = MouseConstraint.create(this.engine);
		World.add(this.engine.world, mouseConstraint);
		mouseConstraint.constraint.render.visible = false

		var windowW = AppStore.Window.w
		var windowH = AppStore.Window.h
		var ratio = 112
		this.cradle = Composites.newtonsCradle((windowW * 0.5) - ((ratio*6) >> 1), 0, 4, ratio, windowH * 0.58);
		World.add(this.engine.world, this.cradle);

		this.bodies = this.cradle.bodies
		for (var i = 0; i < this.bodies.length; i++) {
			var body = this.bodies[i]
			body.active = false
			body.render.visible = false
			body.render.lineWidth = 0
			this.cradle.constraints[i].render.visible = false
		};

		Body.translate(this.cradle.bodies[0], { x: -580, y: -500 });

		var explosionFrag = glslify('../shaders/metal/diffusion-mix-frag.glsl')
		var imgUrl = AppStore.Preloader.getImageURL('metal-experience-noise')
		var ballAUrl = AppStore.Preloader.getImageURL('metal-experience-ball-a')
		var gradientMaskUrl = AppStore.Preloader.getImageURL('metal-experience-gradient-mask')
		this.cranes = []
		for (var i = 0; i < 4; i++) {
			var g = {}

			var line = AppStore.getGraphics()
			this.pxContainer.addChild(line)

			var ball = AppStore.getSprite()
			ball.texture = PIXI.Texture.fromImage(ballAUrl)
			ball.texture.width = ball.texture.height = 512
			ball.anchor.x = ball.anchor.y = 0.5
			ball.scale.x = ball.scale.y = 0.5

			var mask = AppStore.getSprite()
			mask.texture = PIXI.Texture.fromImage(gradientMaskUrl)
			mask.anchor.x = mask.anchor.y = 0.5
			mask.scale.x = mask.scale.y = 0.53

			var texture = PIXI.Texture.fromImage(imgUrl)
			var sprite = AppStore.getSprite()
			sprite.texture = texture
			var uniforms = undefined
			sprite.shader = new PIXI.AbstractFilter(null, explosionFrag, uniforms = {
				resolution: { type: '2f', value: { x: 1, y: 1 } },
				uSampler: {type: 'sampler2D', value: texture},
				time: {type: '1f', value: 0},
				rotation: {type: '1f', value: Utils.Rand(-80,80)},
				displace: {type: '1f', value: Utils.Rand(0.01,0.3)},
				intensity: {type: '1f', value: 0.1},
				zoom: {type: '1f', value: Utils.Rand(1,5)},
				octave: {type: '1f', value: Utils.Rand(0.5,1)},
				offset: { type: '2f', value: { x: Utils.Rand(8,24), y: Utils.Rand(2,16) } },
		    })
			sprite.blendMode = PIXI.BLEND_MODES.OVERLAY

			var holder = AppStore.getContainer()
			holder.addChild(ball)
			holder.addChild(sprite)
			holder.addChild(mask)
			sprite.mask = mask
			this.pxContainer.addChild(holder)

			var ratio = 226
			sprite.width = ratio
			sprite.height = ratio
			uniforms.resolution.x = ratio
			uniforms.resolution.y = ratio
			// console.log(sprite.width, sprite.height, sprite.scale.x, sprite.scale.y)
			sprite.anchor.x = sprite.anchor.y = 0.5

			g.holder = holder
			g.ball = ball
			g.lava = sprite
			g.line = line
			g.mask = mask
			g.uniforms = uniforms
			this.cranes[i] = g
		};

		this.runner = Engine.run(this.engine);

        Matter.Events.on(this.engine, 'collisionStart', function(event) {
			var pairs = event.pairs;
			for (var i = 0; i < pairs.length; i++) {
				var pair = pairs[i];
				pair.bodyA.active = true
				pair.bodyB.active = true
			}

			clearTimeout(this.ambientSoundTimeout)
			this.ambientSoundTimeout = setTimeout(()=>{
				AppStore.Sounds.play('metal-sounds-ambient', { interrupt: createjs.Sound.INTERRUPT_ANY })
			}, 300)

		})

		Matter.Events.on(this.engine, 'collisionActive', function(event) {
			var pairs = event.pairs;
			for (var i = 0; i < pairs.length; i++) {
				var pair = pairs[i];
				pair.bodyA.active = true
				pair.bodyB.active = true
			}

			clearTimeout(this.burnSoundTimeout)
			this.burnSoundTimeout = setTimeout(()=>{
				AppStore.Sounds.play('metal-sounds-burn', { interrupt: createjs.Sound.INTERRUPT_ANY, volume:Utils.Rand(0.2, 0.8, 0.1) })	
			}, 300)
			
		})

		Matter.Events.on(this.engine, 'collisionEnd', function(event) {
			var pairs = event.pairs;
			for (var i = 0; i < pairs.length; i++) {
				var pair = pairs[i];
				pair.bodyA.active = false
				pair.bodyB.active = false
			}
		})

		super.componentDidMount()
	}
	update() {
		
  		for (var i = 0; i < this.cranes.length; i++) {
  			var body = this.cradle.bodies[i]
  			var constraint = this.cradle.constraints[i]
  			var constraintStart = constraint.pointA
  			var constraintEnd = constraint.bodyB.position
  			var uniforms = this.cranes[i].uniforms
  			var ball = this.cranes[i].ball
  			var lava = this.cranes[i].lava
  			var holder = this.cranes[i].holder
  			var line = this.cranes[i].line
  			var displacement = this.cranes[i].displacement

  			holder.x = body.position.x
  			holder.y = body.position.y

  			if(body.active) {
  				uniforms.intensity.value += (1.6 - uniforms.intensity.value) * 0.1
  			}else{
  				uniforms.intensity.value -= (uniforms.intensity.value + 0.5) * 0.005
  			}

  			uniforms.time.value += 0.001

  			line.clear()
  			line.lineStyle(1, 0xffffff, 1);
			line.moveTo(constraintStart.x, constraintStart.y)
			line.lineTo(constraintEnd.x, constraintEnd.y)

  		};

		super.update()
	}
	resize() {
		var windowW = AppStore.Window.w
		var windowH = AppStore.Window.h

		this.matterCanvas.get(0).width = windowW
		this.matterCanvas.get(0).height = windowH

		super.resize()
	}
	componentWillUnmount() {
		Matter.Engine.clear(this.engine)
		Matter.Runner.stop(this.runner)
		Matter.Engine.events = {}

		for (var i = 0; i < this.cranes.length; i++) {
  			var ball = this.cranes[i].ball
  			var mask = this.cranes[i].mask
  			var lava = this.cranes[i].lava
  			var holder = this.cranes[i].holder
  			var line = this.cranes[i].line
  			var uniforms = this.cranes[i].uniforms
  			var displacement = this.cranes[i].displacement
  			
  			uniforms = null

  			AppStore.releaseGraphics(line)
  			AppStore.releaseSprite(ball)
  			AppStore.releaseSprite(mask)
  			AppStore.releaseSprite(lava)
  			holder.removeChildren()
  			AppStore.releaseContainer(holder)
  		}

  		AppStore.releaseSprite(this.videoSprite)
		super.componentWillUnmount()
	}
}

