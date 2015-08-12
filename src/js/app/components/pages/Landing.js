import Page from 'Page'
import LandingSlideshow from 'LandingSlideshow'
import AppStore from 'AppStore'

export default class Landing extends Page {
	constructor(props) {
		super(props)
	}
	componentDidMount() {
		this.landingSlideshow = new LandingSlideshow(this.pxContainer)
		this.landingSlideshow.componentDidMount()

		this.onKeyPressed = this.onKeyPressed.bind(this)
		$(document).keydown(this.onKeyPressed)

		super.componentDidMount()
	}
	onKeyPressed(e) {
		switch(e.which) {
	        case 37: // left
	        	console.log('left')
	        	this.landingSlideshow.previous()
	        break;
	        case 39: // right
	        	console.log('right')
	        	this.landingSlideshow.next()
	        break;
	        default: return;
	    }
	    e.preventDefault();
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
		this.landingSlideshow.resize()
		super.resize()
	}
}

