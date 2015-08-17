import AppConstants from 'AppConstants'
import AppStore from 'AppStore'
import Vec2 from 'Vec2'
import Utils from 'Utils'
import BezierEasing from 'bezier-easing'

export default class LandingSlideshow {
	constructor(pxContainer) {
		this.pxContainer = pxContainer
		this.currentId = 'alaska'
	}
	componentDidMount() {
		this.slideshowContainer = new PIXI.Container()
	 	this.slideshowWrapper = new PIXI.Container()
	 	this.pxContainer.addChild(this.slideshowContainer)
	 	this.slideshowContainer.addChild(this.slideshowWrapper)
	 	this.counter = 0
	 	
	 	var planets = AppStore.planets()
	 	this.slides = []
	 	for (var i = 0; i < planets.length; i++) {
	 		var s = {}
	 		var id = planets[i]
	 		var wrapperContainer = new PIXI.Container()
	 		var maskRect = {
	 			g: new PIXI.Graphics(),
	 			newW: 0,
	 			width: 0,
	 			x: 0
	 		}
	 		var imgUrl = AppStore.mainImageUrl(id, AppConstants.RESPONSIVE_IMAGE)
	 		var texture = PIXI.Texture.fromImage(imgUrl)
	 		var sprite = new PIXI.Sprite(texture)
	 		sprite.params = {}
	 		this.slideshowWrapper.addChild(wrapperContainer)
	 		wrapperContainer.addChild(sprite)
	 		wrapperContainer.addChild(maskRect.g)
	 		sprite.mask = maskRect.g
	 		s.oldPosition = new Vec2(0, 0)
	 		s.newPosition = new Vec2(0, 0)
	 		s.wrapperContainer = wrapperContainer
	 		s.sprite = sprite
	 		s.texture = texture
	 		s.maskRect = maskRect
	 		s.imgResponsiveSize = AppStore.responsiveImageSize(AppConstants.RESPONSIVE_IMAGE)
	 		s.imgUrl = imgUrl
	 		s.id = planets[i]
	 		this.slides[i] = s
	 	}

	 	this.maskEasing = BezierEasing(.21,1.47,.52,1)
	 	this.chooseSlideToHighlight()
	}
	drawCenteredMaskRect(graphics, x, y, w, h) {
		graphics.clear()
		graphics.beginFill(0xffff00, 1)
		graphics.drawRect(x, y, w, h)
		graphics.endFill()
	}
	next() {
		var firstElement = this.slides.shift()
		this.slides.push(firstElement)
		this.elementThatMovedInSlidesArray = firstElement
		this.chooseSlideToHighlight()
		this.applyValuesToSlides()
	}
	previous() {
		var lastElement = this.slides.pop()
		this.slides.unshift(lastElement)
		this.elementThatMovedInSlidesArray = lastElement
		this.chooseSlideToHighlight()
		this.applyValuesToSlides()
	}
	chooseSlideToHighlight() {
		var totalLen = this.slides.length-1
		for (var i = 0; i < this.slides.length; i++) {
			var slide = this.slides[i]
			if(i == 2) {
				slide.highlight = true // Highlight the middle elements
				this.currentId = slide.id
				this.slideshowWrapper.setChildIndex(slide.wrapperContainer, totalLen)
			}else{
				slide.highlight = false
				this.slideshowWrapper.setChildIndex(slide.wrapperContainer, i)
			}
		}
	}
	applyResponsiveImgToSlideDependsWindow(slide) {
		var s = slide
		var imgUrl = AppStore.mainImageUrl(s.id, AppConstants.RESPONSIVE_IMAGE)
		if(s.imgUrl != imgUrl) {
			s.imgResponsiveSize = AppStore.responsiveImageSize(AppConstants.RESPONSIVE_IMAGE)
			s.texture.destroy(true)
			s.texture = PIXI.Texture.fromImage(imgUrl)
			s.sprite.texture = s.texture
			s.imgUrl = imgUrl
		}
	}
	resizeAndPositionImgSprite(slide, maskSlideW, windowW, windowH) {
		var s = slide
		var resizeVars = Utils.ResizePositionProportionallyWithAnchorCenter(maskSlideW, windowH, s.imgResponsiveSize[0], s.imgResponsiveSize[1])
		s.sprite.anchor.x = 0.5
		s.sprite.anchor.y = 0.5
		s.sprite.scale.x = resizeVars.scale
		s.sprite.scale.y = resizeVars.scale
		s.sprite.width = resizeVars.width
		s.sprite.height = resizeVars.height
		s.sprite.x = resizeVars.left
		s.sprite.y = resizeVars.top
	}
	update() {
		var slides = this.slides
		this.counter += 0.012
		for (var i = 0; i < slides.length; i++) {
			var s = slides[i]
			s.maskRect.valueScale += (0.4 - s.maskRect.valueScale) * 0.05
			var ease = this.maskEasing.get(s.maskRect.valueScale)
			s.wrapperContainer.x += (s.newPosition.x - s.wrapperContainer.x) * ease
			s.maskRect.width = s.maskRect.newW * ease
			var maskRectX = (1 - ease) * s.maskRect.newX
			this.drawCenteredMaskRect(s.maskRect.g, maskRectX, 0, s.maskRect.width, s.maskRect.height)
			s.sprite.skew.x = Math.cos(this.counter) * 0.020
			s.sprite.skew.y = Math.sin(this.counter) * 0.020
		}
		this.slideshowContainer.scale.x += (this.slideshowContainer.scaleXY - this.slideshowContainer.scale.x) * 0.08
		this.slideshowContainer.scale.y += (this.slideshowContainer.scaleXY - this.slideshowContainer.scale.x) * 0.08
		// this.slideshowContainer.y = this.slideshowContainer.baseY + Math.sin(this.counter) * 4
	}
	positionSlideshowContainer() {
		var windowW = AppStore.Window.w
		var windowH = AppStore.Window.h
		var lastSlide = this.slides[this.slides.length-1]
		var containerTotalW = lastSlide.newPosition.x + lastSlide.maskRect.newW
		this.slideshowContainer.pivot.x = containerTotalW >> 1
		this.slideshowContainer.pivot.y = windowH >> 1
		this.slideshowContainer.x = (windowW >> 1)
		this.slideshowContainer.y = (windowH >> 1)
		this.slideshowContainer.baseY = this.slideshowContainer.y
		this.slideshowContainer.scale.x = 1.3
		this.slideshowContainer.scale.y = 1.3
		this.slideshowContainer.scaleXY = 1.05
	}
	applyValuesToSlides() {
		var windowW = AppStore.Window.w
		var windowH = AppStore.Window.h
		var currentPosX = 0
		for (var i = 0; i < this.slides.length; i++) {
			var s = this.slides[i]
			this.applyResponsiveImgToSlideDependsWindow(s)
			var hightlightedSlideW = windowW * 0.7
			var normalSlideW = windowW * 0.15
			var slideW = 0
			if(s.highlight) slideW = hightlightedSlideW
			else slideW = normalSlideW
			this.resizeAndPositionImgSprite(s, slideW, windowW, windowH)
			s.maskRect.newW = slideW
			s.maskRect.height = windowH
			s.maskRect.newX = slideW >> 1
			s.maskRect.valueScale = 2
			s.oldPosition.x = s.newPosition.x
			s.newPosition.x = currentPosX
			if(this.elementThatMovedInSlidesArray != undefined && this.elementThatMovedInSlidesArray.id == s.id){
				s.wrapperContainer.x = s.newPosition.x
			}
			currentPosX += slideW
		}
		this.positionSlideshowContainer()
	}
	resize() {
		this.applyValuesToSlides()
	}
}
