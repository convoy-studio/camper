import Page from 'Page'
import LandingSlideshow from 'LandingSlideshow'
import AppStore from 'AppStore'
import Compass from 'Compass'
import ArrowBtn from 'ArrowBtn'
import AppConstants from 'AppConstants'
import Router from 'Router'

export default class Landing extends Page {
	constructor(props) {
		props.data.isMobile = AppStore.Detector.isMobile
		if(props.data.isMobile) {
			var mobileScope = []
			var planets = AppStore.planets()
			var infos = AppStore.generalInfosLangScope()
			for (var i = 0; i < planets.length; i++) {
				var planet = planets[i]
				var g = {
					id: planet,
					planetTxt: infos.planet.toUpperCase(),
					planetName: planet.toUpperCase(),
					imgsrc: AppStore.mainImageUrl(planet, AppConstants.RESPONSIVE_IMAGE),
					url: "#!/planet/" + planet + '/0'
				}
				mobileScope[i] = g
			}
			props.data.mobileScope = mobileScope
		}

		super(props)
	}
	componentDidMount() {

		if(AppStore.Detector.isMobile != true) {

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

			this.arrowClicked = this.arrowClicked.bind(this)
			this.arrowMouseEnter = this.arrowMouseEnter.bind(this)
			this.arrowMouseLeave = this.arrowMouseLeave.bind(this)
			this.middleAreaMouseEnter = this.middleAreaMouseEnter.bind(this)
			this.middleAreaMouseLeave = this.middleAreaMouseLeave.bind(this)
			this.middleAreaClick = this.middleAreaClick.bind(this)

			this.previousArea = this.child.find('.interface .previous-area')
			this.nextArea = this.child.find('.interface .next-area')
			this.middleArea = this.child.find('.interface .middle-area')
			this.previousArea.on('click', this.arrowClicked)
			this.nextArea.on('click', this.arrowClicked)
			this.previousArea.on('mouseenter', this.arrowMouseEnter)
			this.nextArea.on('mouseenter', this.arrowMouseEnter)
			this.middleArea.on('mouseenter', this.middleAreaMouseEnter)
			this.previousArea.on('mouseleave', this.arrowMouseLeave)
			this.nextArea.on('mouseleave', this.arrowMouseLeave)
			this.middleArea.on('mouseleave', this.middleAreaMouseLeave)

			this.middleArea.on('click', this.middleAreaClick)

			this.tweenCompass = TweenMax.to(this.compass.container.scale, 0.6, { x:1.1, y:1.1, ease:Back.easeInOut })
			this.tweenCompass.pause(0)
		}

		super.componentDidMount()
	}
	middleAreaMouseEnter(e) {
		e.preventDefault()
		this.tweenCompass.timeScale(1).play()
	}
	middleAreaMouseLeave(e) {
		e.preventDefault()
		this.tweenCompass.timeScale(1.4).reverse()
	}
	middleAreaClick(e) {
		e.preventDefault()
		var url = "/planet/" + this.landingSlideshow.currentId
		Router.setHash(url)
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
		if(AppStore.Detector.isMobile) return 
		
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
		
		if(AppStore.Detector.isMobile) return 

		// var windowW = AppStore.Window.w
		// var mouseX = AppStore.Mouse.x
		this.landingSlideshow.update()
		this.compass.update()
		// this.direction = AppConstants.NONE
		// var area = windowW * 0.25
		// if(mouseX > ((windowW >> 1) - area) && mouseX < ((windowW >> 1) + area)) {
		// 	this.direction = AppConstants.TOP
		// }

		super.update()
	}
	resize() {
		super.resize()

		if(AppStore.Detector.isMobile) return 

		var windowW = AppStore.Window.w
		var windowH = AppStore.Window.h
		this.landingSlideshow.resize()
		this.compass.resize()
		this.compass.position(
			windowW >> 1,
			(windowH >> 1) + (windowH * 0.03)
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
		this.middleArea.css({
			left: windowW * AppConstants.LANDING_NORMAL_SLIDE_PERCENTAGE,
			width: windowW - ((windowW * AppConstants.LANDING_NORMAL_SLIDE_PERCENTAGE) << 1),
			height: windowH
		})
	}
	componentWillUnmount() {
		super.componentWillUnmount()

		if(AppStore.Detector.isMobile) return 

		this.landingSlideshow.componentWillUnmount()
		this.compass.componentWillUnmount()
		this.arrowLeft.componentWillUnmount()
		this.arrowRight.componentWillUnmount()
		$(document).off('keydown', this.onKeyPressed)

		this.previousArea.off('click', this.arrowClicked)
		this.nextArea.off('click', this.arrowClicked)
		this.previousArea.off('mouseenter', this.arrowMouseEnter)
		this.nextArea.off('mouseenter', this.arrowMouseEnter)
		this.previousArea.off('mouseleave', this.arrowMouseLeave)
		this.nextArea.off('mouseleave', this.arrowMouseLeave)

		this.middleArea.off('mouseenter', this.middleAreaMouseEnter)
		this.middleArea.off('mouseleave', this.middleAreaMouseLeave)
		this.middleArea.off('click', this.middleAreaClick)
	}
}

