import AppConstants from 'AppConstants'
import AppStore from 'AppStore'
import Vec2 from 'Vec2'

export default class LandingSlideshow {
	constructor(pxContainer) {
		this.pxContainer = pxContainer
	}
	componentDidMount() {
		this.slideshowContainer = new PIXI.Container()
	 	this.slideshowWrapper = new PIXI.Container()
	 	this.pxContainer.addChild(this.slideshowContainer)
	 	this.slideshowContainer.addChild(this.slideshowWrapper)
	 	
	 	var planets = AppStore.planets()
	 	this.slides = []
	 	for (var i = 0; i < planets.length; i++) {
	 		var s = {}
	 		var id = planets[i]
	 		var slideWrapper = new PIXI.Container()
	 		var imgUrl = AppStore.mainImageUrl(id, AppConstants.RESPONSIVE_IMAGE)
	 		var slideTexture = PIXI.Texture.fromImage(imgUrl)
	 		var slideSprite = new PIXI.Sprite(slideTexture)
	 		this.slideshowWrapper.addChild(slideWrapper)
	 		slideWrapper.addChild(slideSprite)
	 		s.oldPosition = new Vec2(0, 0)
	 		s.newPosition = new Vec2(0, 0)
	 		s.slideWrapper = slideWrapper
	 		s.slideSprite = slideSprite
	 		s.slideTexture = slideTexture
	 		s.responsiveSize = AppStore.responsiveImageSize(AppConstants.RESPONSIVE_IMAGE)
	 		s.imgUrl = imgUrl
	 		s.id = planets[i]
	 		this.slides[i] = s
	 	}
	 	this.chooseSlideToHighlight()
	}
	next() {
		var firstElement = this.slides.shift()
		this.slides.push(firstElement)
		this.chooseSlideToHighlight()
	}
	previous() {
		var lastElement = this.slides.pop()
		this.slides.unshift(lastElement)
		this.chooseSlideToHighlight()
	}
	chooseSlideToHighlight() {
		for (var i = 0; i < this.slides.length; i++) {
			if(i == 2) this.slides[i].highlight = true // Highlight the middle elements
			else this.slides[i].highlight = false
		}
	}
	resize() {
		var windowW = AppStore.Window.w
		var windowH = AppStore.Window.h

		for (var i = 0; i < this.slides.length; i++) {
			var s = this.slides[i]
			var imgUrl = AppStore.mainImageUrl(s.id, AppConstants.RESPONSIVE_IMAGE)

			var hightlightedSlideW = windowW * 0.6
			var normalSlideW = windowW * 0.2

			if(s.imgUrl != imgUrl) {
				s.responsiveSize = AppStore.responsiveImageSize(AppConstants.RESPONSIVE_IMAGE)
				s.slideTexture.destroy(true)
				s.slideTexture = PIXI.Texture.fromImage(imgUrl)
				s.slideSprite.texture = s.slideTexture
				s.imgUrl = imgUrl
			}


		}
	 	console.log(this.slides)
	}
}
