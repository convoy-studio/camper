import Page from 'Page'
import LandingSlideshow from 'LandingSlideshow'
import AppStore from 'AppStore'
import Compass from 'Compass'
import ArrowBtn from 'ArrowBtn'
import AppConstants from 'AppConstants'

export default class Landing extends Page {
	constructor(props) {
		super(props)
	}
	componentDidMount() {
		this.landingSlideshow = new LandingSlideshow(this.pxContainer)
		this.landingSlideshow.componentDidMount()

		this.compass = new Compass(this.pxContainer)
		this.compass.componentDidMount()

		this.arrowLeft = new ArrowBtn(this.pxContainer, AppConstants.LEFT)
		this.arrowLeft.componentDidMount()

		this.arrowRight = new ArrowBtn(this.pxContainer, AppConstants.RIGHT)
		this.arrowRight.componentDidMount()

		this.onKeyPressed = this.onKeyPressed.bind(this)
		$(document).on('keydown', this.onKeyPressed)

		super.componentDidMount()
	}
	onKeyPressed(e) {
	    e.preventDefault();
		switch(e.which) {
	        case 37: // left
	        	this.previous()
	        break;
	        case 39: // right
	        	this.next()
	        break;
	        default: return;
	    }
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

		var windowW = AppStore.Window.w
		var mouseX = AppStore.Mouse.x
		if(mouseX < windowW * 0.25) {
			this.arrowLeft.rollover()
		}else if(mouseX > windowW * 0.75) {
			this.arrowRight.rollover()
		}else{
			this.arrowLeft.rollout()
			this.arrowRight.rollout()
		}

		super.update()
	}
	resize() {
		var windowW = AppStore.Window.w
		var windowH = AppStore.Window.h
		this.landingSlideshow.resize()
		this.compass.resize()

		this.arrowRight.position(
			windowW - (AppConstants.PADDING_AROUND << 2),
			windowH >> 1
		)

		this.arrowLeft.position(
			(AppConstants.PADDING_AROUND << 2),
			windowH >> 1
		)

		super.resize()
	}
	componentWillUnmount() {
		this.landingSlideshow.componentWillUnmount()
		this.compass.componentWillUnmount()
		this.arrowLeft.componentWillUnmount()
		this.arrowRight.componentWillUnmount()
		$(document).off('keydown', this.onKeyPressed)
		super.componentWillUnmount()
	}
}

