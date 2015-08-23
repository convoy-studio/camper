import Page from 'Page'
import LandingSlideshow from 'LandingSlideshow'
import AppStore from 'AppStore'
import Compass from 'Compass'
import ArrowBtn from 'ArrowBtn'
import AppConstants from 'AppConstants'
import Router from 'Router'

export default class Landing extends Page {
	constructor(props) {
		super(props)
	}
	componentDidMount() {
		this.landingSlideshow = new LandingSlideshow(this.pxContainer, this.child)
		this.landingSlideshow.componentDidMount()

		this.compass = new Compass(this.pxContainer)
		this.compass.componentDidMount()

		this.arrowLeft = new ArrowBtn(this.child.find('.previous-btn'), AppConstants.LEFT)
		this.arrowLeft.componentDidMount()
		this.arrowRight = new ArrowBtn(this.child.find('.next-btn'), AppConstants.RIGHT)
		this.arrowRight.componentDidMount()

		this.onKeyPressed = this.onKeyPressed.bind(this)
		$(document).on('keydown', this.onKeyPressed)

		this.onStageClicked = this.onStageClicked.bind(this)
		this.parent.on('click', this.onStageClicked)

		this.arrowClicked = this.arrowClicked.bind(this)
		this.arrowMouseEnter = this.arrowMouseEnter.bind(this)
		this.arrowMouseLeave = this.arrowMouseLeave.bind(this)

		this.previousArea = this.child.find('.interface .previous-area')
		this.nextArea = this.child.find('.interface .next-area')
		this.previousArea.on('click', this.arrowClicked)
		this.nextArea.on('click', this.arrowClicked)
		this.previousArea.on('mouseenter', this.arrowMouseEnter)
		this.nextArea.on('mouseenter', this.arrowMouseEnter)
		this.previousArea.on('mouseleave', this.arrowMouseLeave)
		this.nextArea.on('mouseleave', this.arrowMouseLeave)

		super.componentDidMount()
	}
	arrowClicked(e) {
		e.preventDefault()
		var id = e.currentTarget.id
		var direction = id.toUpperCase()
		switch(direction) {
			case AppConstants.LEFT:
				this.previous()
				break
			case AppConstants.RIGHT:
				this.next()
				break
		}
	}
	arrowMouseEnter(e) {
		e.preventDefault()
		var id = e.currentTarget.id
		var direction = id.toUpperCase()
		var arrow = this.getArrowByDirection(direction)
		arrow.mouseOver()
	}
	arrowMouseLeave(e) {
		e.preventDefault()
		var id = e.currentTarget.id
		var direction = id.toUpperCase()
		var arrow = this.getArrowByDirection(direction)
		arrow.mouseOut()
	}
	getArrowByDirection(direction) {
		switch(direction) {
			case AppConstants.LEFT:
				return this.arrowLeft
				break
			case AppConstants.RIGHT:
				return this.arrowRight
				break
		}
	}
	onStageClicked(e) {
		e.preventDefault()
		switch(this.direction) {
			case AppConstants.LEFT:
				this.previous()
				break
			case AppConstants.RIGHT:
				this.next()
				break
			case AppConstants.TOP:
				var url = "/planet/" + this.landingSlideshow.currentId
				Router.setHash(url)
				break
		}
	}
	onKeyPressed(e) {
	    e.preventDefault()
		switch(e.which) {
	        case 37: // left
	        	this.previous()
	        	break
	        case 39: // right
	        	this.next()
	        	break
	        default: return;
	    }
	}
	updateCompassPlanet() {
		var planetData = AppStore.productsDataById(this.landingSlideshow.currentId)
		this.compass.updateData(planetData)
	}
	didTransitionInComplete() {
		super.didTransitionInComplete()
		this.updateCompassPlanet()
	}
	didTransitionOutComplete() {
		super.didTransitionOutComplete()
	}
	next() {
		this.landingSlideshow.next()
		this.updateCompassPlanet()
	}
	previous() {
		this.landingSlideshow.previous()
		this.updateCompassPlanet()
	}
	update() {
		var windowW = AppStore.Window.w
		var mouseX = AppStore.Mouse.x
		this.landingSlideshow.update()
		this.compass.update()

		// if(mouseX < windowW * 0.25) {
		// 	this.direction = AppConstants.LEFT
		// 	// this.arrowLeft.rollover()
		// }else if(mouseX > windowW * 0.75) {
		// 	this.direction = AppConstants.RIGHT
		// 	// this.arrowRight.rollover()
		// }else{
		// 	this.direction = AppConstants.NONE
		// 	// this.arrowLeft.rollout()
		// 	// this.arrowRight.rollout()
		// }
		this.direction = AppConstants.NONE

		var area = windowW * 0.25
		if(mouseX > ((windowW >> 1) - area) && mouseX < ((windowW >> 1) + area)) {
			this.direction = AppConstants.TOP
		}

		super.update()
	}
	resize() {
		var windowW = AppStore.Window.w
		var windowH = AppStore.Window.h
		this.landingSlideshow.resize()
		this.compass.resize()

		this.compass.position(
			windowW >> 1,
			(windowH >> 1) - (windowH * 0.05)
		)

		this.arrowRight.position(
			windowW - ((windowW * AppConstants.LANDING_NORMAL_SLIDE_PERCENTAGE) >> 1),
			windowH >> 1
		)

		this.arrowLeft.position(
			((windowW * AppConstants.LANDING_NORMAL_SLIDE_PERCENTAGE) >> 1) - this.arrowLeft.width,
			windowH >> 1
		)

		this.previousArea.css({
			width: windowW * AppConstants.LANDING_NORMAL_SLIDE_PERCENTAGE,
			height: windowH
		})
		this.nextArea.css({
			width: windowW * AppConstants.LANDING_NORMAL_SLIDE_PERCENTAGE,
			height: windowH,
			left: windowW - (windowW * AppConstants.LANDING_NORMAL_SLIDE_PERCENTAGE)
		})

		super.resize()
	}
	componentWillUnmount() {
		this.landingSlideshow.componentWillUnmount()
		this.compass.componentWillUnmount()
		this.arrowLeft.componentWillUnmount()
		this.arrowRight.componentWillUnmount()
		$(document).off('keydown', this.onKeyPressed)
		this.parent.off('click', this.onStageClicked)

		this.previousArea.off('click', this.arrowClicked)
		this.nextArea.off('click', this.arrowClicked)
		this.previousArea.off('mouseenter', this.arrowMouseEnter)
		this.nextArea.off('mouseenter', this.arrowMouseEnter)
		this.previousArea.off('mouseleave', this.arrowMouseLeave)
		this.nextArea.off('mouseleave', this.arrowMouseLeave)

		super.componentWillUnmount()
	}
}

