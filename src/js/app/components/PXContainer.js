import AppStore from 'AppStore'

export default class PXContainer {
	constructor() {
	}
	init(elementId) {
		this.renderer = new PIXI.CanvasRenderer(800, 600)
		// this.renderer = new PIXI.autoDetectRenderer(800, 600);
		var el = $(elementId)
		$(this.renderer.view).attr('id', 'px-container')
		el.append(this.renderer.view)

		this.animate = this.animate.bind(this)

		this.stage = new PIXI.Container()

		// // load the texture we need
		// PIXI.loader.add('bunny', 'image/bunny.png', true).load((loader, resources)=> {
		//     // This creates a texture from a 'bunny.png' image.
		//     this.bunny = new PIXI.Sprite(resources.bunny.texture);

		//     // Setup the position and scale of the bunny
		//     this.bunny.position.x = 400;
		//     this.bunny.position.y = 300;

		//     this.bunny.scale.x = 1;
		//     this.bunny.scale.y = 1;

		//     // Add the bunny to the scene we are building.
		//     this.stage.addChild(this.bunny);
		// });
		this.animate();
	}
	add(child) {
		this.stage.addChild(child)
	}
	remove(child) {
		this.stage.removeChild(child)
	}
	animate() {
		// start the timer for the next animation loop
	    requestAnimationFrame(this.animate);

	    // this is the main render call that makes pixi draw your container and its children.
	    this.renderer.render(this.stage);
	}
	resize() {
		var windowW = AppStore.Window.w
		var windowH = AppStore.Window.h
		this.renderer.resize(windowW, windowH)
	}
}
