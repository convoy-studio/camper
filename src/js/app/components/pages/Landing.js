import Page from 'Page'
import LandingSlideshow from 'LandingSlideshow'
import AppStore from 'AppStore'
import Compass from 'Compass'

export default class Landing extends Page {
	constructor(props) {
		super(props)
	}
	componentDidMount() {
		this.landingSlideshow = new LandingSlideshow(this.pxContainer)
		this.landingSlideshow.componentDidMount()

		this.compass = new Compass(this.pxContainer)
		this.compass.componentDidMount()

		this.onKeyPressed = this.onKeyPressed.bind(this)
		$(document).keydown(this.onKeyPressed)

		super.componentDidMount()
	}
	onKeyPressed(e) {
		switch(e.which) {
	        case 37: // left
	        	this.previous()
	        break;
	        case 39: // right
	        	this.next()
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
	next() {
		this.landingSlideshow.next()
		this.compass.highlightPlanet(this.landingSlideshow.currentId)
	}
	previous() {
		this.landingSlideshow.previous()
		this.compass.highlightPlanet(this.landingSlideshow.currentId)
	}
	update() {
		this.landingSlideshow.update()
		this.compass.update()
		super.update()
	}
	resize() {
		var windowW = AppStore.Window.w
		var windowH = AppStore.Window.h
		this.landingSlideshow.resize()
		this.compass.resize()
		super.resize()
	}
}

