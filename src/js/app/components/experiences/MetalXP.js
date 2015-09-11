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
		this.videoSprite = new PIXI.Sprite(texture)
		this.pxContainer.addChild(this.videoSprite)

		// Matter module aliases
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
		this.cranes = []
		for (var i = 0; i < 4; i++) {
			var g = {}

			var line = new PIXI.Graphics()
			this.pxContainer.addChild(line)

			var ball = new PIXI.Sprite(PIXI.Texture.fromImage(AppStore.Preloader.getImageURL('metal-experience-ball-a')))
			ball.anchor.x = ball.anchor.y = 0.5
			ball.scale.x = ball.scale.y = 0.5

			// var lava = new PIXI.Sprite(PIXI.Texture.fromImage(AppStore.Preloader.getImageURL('metal-experience-ball-b')))
			// lava.anchor.x = lava.anchor.y = 0.5
			// lava.scale.x = lava.scale.y = 0.5

			var mask = new PIXI.Sprite(PIXI.Texture.fromImage(AppStore.Preloader.getImageURL('metal-experience-gradient-mask')))
			mask.anchor.x = mask.anchor.y = 0.5
			mask.scale.x = mask.scale.y = 0.53

			// var dsprite = new PIXI.Sprite(PIXI.Texture.fromImage(AppStore.Preloader.getImageURL('metal-experience-displacement')))
			// var dfilter = new PIXI.filters.DisplacementFilter(dsprite)
			// var displacement = {
			// 	sprite: dsprite,
			// 	filter: dfilter
			// }
			// dsprite.scale.x = dsprite.scale.y = 2
			// dsprite.alpha = 0.1
			// dsprite.y = 100
			// dfilter.padding = 500

			var texture = PIXI.Texture.fromImage(imgUrl)
			var sprite = new PIXI.Sprite(texture)
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
			// holder.addChild(lava)
			holder.addChild(sprite)
			holder.addChild(mask)
			// holder.addChild(dsprite)
			sprite.mask = mask
			this.pxContainer.addChild(holder)
			// ball.filters = [dfilter]

			var ratio = 226
			sprite.width = ratio
			sprite.height = ratio
			uniforms.resolution.x = ratio
			uniforms.resolution.y = ratio
			sprite.anchor.x = sprite.anchor.y = 0.5

			g.holder = holder
			g.ball = ball
			g.lava = sprite
			g.line = line
			g.uniforms = uniforms
			// g.displacement = displacement
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
		})

		Matter.Events.on(this.engine, 'collisionActive', function(event) {
			var pairs = event.pairs;
			for (var i = 0; i < pairs.length; i++) {
				var pair = pairs[i];
				pair.bodyA.active = true
				pair.bodyB.active = true
			}
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
  			// displacement.sprite.rotation += 0.01
  			// displacement.sprite.scale.x = displacement.sprite.scale.y = 1 + Math.sin(uniforms.time.value*2) * 4

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
  			var lava = this.cranes[i].lava
  			var holder = this.cranes[i].holder
  			var line = this.cranes[i].line
  			var displacement = this.cranes[i].displacement
  			
  			ball.destroy()
  			lava.destroy()

  			holder.removeChildren()
  			AppStore.releaseContainer(holder)
  		}

		super.componentWillUnmount()
	}
}

