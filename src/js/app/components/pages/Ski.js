import BasePlanetPage from 'BasePlanetPage'
import AppStore from 'AppStore'

export default class Ski extends BasePlanetPage {
	constructor(props) {
		super(props)
	}
	componentDidMount() {
		this.bunny = new PIXI.Sprite.fromImage('image/bunny.png')
	    this.bunny.position.x = 400;
	    this.bunny.position.y = 200;
	    this.bunny.scale.x = 0.5;
	    this.bunny.scale.y = 0.5;
	    this.pxContainer.addChild(this.bunny)
		super.componentDidMount()
	}
	didTransitionInComplete() {
		super.didTransitionInComplete()
	}
	didTransitionOutComplete() {
		super.didTransitionOutComplete()
	}
	resize() {
		var windowW = AppStore.Window.w
		var windowH = AppStore.Window.h
		super.resize()
	}
}

