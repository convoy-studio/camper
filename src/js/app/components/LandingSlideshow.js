import AppConstants from 'AppConstants'
import AppStore from 'AppStore'
import Vec2 from 'Vec2'
import Utils from 'Utils'
import BezierEasing from 'bezier-easing'
import Router from 'Router'
const glslify = require('glslify')

export default class LandingSlideshow {
	constructor(pxContainer, parentEl) {
		this.parentEl = parentEl
		this.pxContainer = pxContainer
	}
	componentDidMount() {

		var oldHash = Router.getOldHash()
		if(oldHash != undefined) {
			var planet = oldHash.parts[1]
			this.currentId = planet
		}
		this.currentId = (this.currentId == undefined) ? 'alaska' : this.currentId
		AppStore.LandingCurrentPoster = this.currentId

		// this.displacementOffsets = {
		// 	ski: [100, 30, 0.85, 0.85],
		// 	metal: [100, 30, 0.85, 0.85],
		// 	alaska: [100, 30, 0.85, 0.85],
		// 	wood: [0, 0, 0.92, 0.92],
		// 	gemstone: [-80, 0, 0.92, 0.92]
		// }

		var infos = AppStore.generalInfosLangScope()
		this.slideshowContainer = AppStore.getContainer()
	 	this.slideshowWrapper = AppStore.getContainer()
	 	this.pxContainer.addChild(this.slideshowContainer)
	 	this.slideshowContainer.addChild(this.slideshowWrapper)
	 	this.counter = 0
	 	this.planetTitleTxt = infos.planet.toUpperCase()

		var slideshowTitle = this.parentEl.find('.slideshow-title')
		var planetTitle = slideshowTitle.find('.planet-title')
		var planetName = slideshowTitle.find('.planet-name')
	 	this.titleContainer = {
	 		parent: slideshowTitle,
	 		planetTitle: planetTitle,
	 		planetName: planetName
	 	}

	 	this.planetNameTween = TweenMax.fromTo(planetName, 0.5, {scaleX:1.4, scaleY:0, opacity:0}, { scale:1, opacity:1, force3D:true, ease:Elastic.easeOut })
	 	this.planetNameTween.pause(0)

	 	var displacementFrag = glslify('./shaders/displacement.glsl')

	 	var planets = AppStore.planets()
	 	this.slides = []
	 	for (var i = 0; i < planets.length; i++) {
	 		var s = {}
	 		var id = planets[i]
	 		var wrapperContainer = AppStore.getContainer()
	 		var maskRect = {
	 			g: AppStore.getGraphics(),
	 			newW: 0,
	 			width: 0,
	 			x: 0
	 		}
	 		var imgUrl = AppStore.mainImageUrl(id, AppConstants.RESPONSIVE_IMAGE)
	 		// var imgMapUrl = AppStore.mainImageMapUrl(id, AppConstants.RESPONSIVE_IMAGE)
	 		var texture = PIXI.Texture.fromImage(imgUrl)
	 		// var displacementTexture = PIXI.Texture.fromImage(imgMapUrl)
	 		// s.displacementSprite = new PIXI.Sprite(displacementTexture)
	 		// s.displacementSprite.anchor.x = s.displacementSprite.anchor.y = 0.5
	 		// s.displacementFilter = new PIXI.filters.DisplacementFilter(s.displacementSprite)
	 		var sprite = AppStore.getSprite()
	 		sprite.texture = texture
	 		sprite.params = {}
	 		this.slideshowWrapper.addChild(wrapperContainer)
	 		wrapperContainer.addChild(sprite)
	 		wrapperContainer.addChild(maskRect.g)
	 		// wrapperContainer.addChild(s.displacementSprite)
	 		// sprite.filters = [s.displacementFilter]
	 		sprite.mask = maskRect.g
	 		s.oldPosition = new Vec2(0, 0)
	 		s.newPosition = new Vec2(0, 0)
	 		s.wrapperContainer = wrapperContainer
	 		s.sprite = sprite
	 		s.texture = texture
	 		s.maskRect = maskRect
	 		s.planetName = id.toUpperCase()
	 		s.imgResponsiveSize = AppStore.responsiveImageSize(AppConstants.RESPONSIVE_IMAGE)
	 		s.imgUrl = imgUrl
	 		s.id = planets[i]
	 		this.slides[i] = s
	 	}

	 	this.shiftUntilCorrectCurrentSlide()

	 	this.maskEasing = BezierEasing(1,-0.02,.01,1.07)
	 	this.chooseSlideToHighlight()
	}
	shiftUntilCorrectCurrentSlide() {
		if(this.currentId == this.slides[2].id) {
			return
		}else{
			this.shiftNextSlidesArray()
			this.shiftUntilCorrectCurrentSlide()
		}
	}
	updateTitles(title, name) {
		var planetTitle = this.titleContainer.planetTitle
		var planetName = this.titleContainer.planetName
	 	planetTitle.text(title)
	 	planetName.text(name)
	 	this.planetNameTween.play(0)
	}
	drawCenteredMaskRect(graphics, x, y, w, h) {
		graphics.clear()
		graphics.beginFill(0xffff00, 1)
		graphics.drawRect(x, y, w, h)
		graphics.endFill()
	}
	shiftNextSlidesArray() {
		var firstElement = this.slides.shift()
		this.slides.push(firstElement)
		return firstElement
	}
	next() {
		var firstElement = this.shiftNextSlidesArray()
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
				AppStore.LandingCurrentPoster = this.currentId
				this.slideshowWrapper.setChildIndex(slide.wrapperContainer, totalLen)
				this.updateTitles(this.planetTitleTxt, slide.planetName)
				this.positionTitlesContainer()
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
		s.sprite.toX = resizeVars.left
		s.sprite.y = resizeVars.top
	}
	update() {
		var slides = this.slides
		this.counter += 0.012
		for (var i = 0; i < slides.length; i++) {
			var s = slides[i]
			s.maskRect.valueScale += (1 - s.maskRect.valueScale) * 0.2
			var ease = this.maskEasing.get(s.maskRect.valueScale)
			s.wrapperContainer.x += (s.newPosition.x - s.wrapperContainer.x) * 0.2
			s.maskRect.width += (s.maskRect.newW - s.maskRect.width) * 0.2
			// s.displacementSprite.x = s.displacementSprite.xPos + Math.sin(this.counter) * 18
			// s.displacementSprite.y = s.displacementSprite.yPos + Math.cos(this.counter) * 12
			var maskRectX = (1 - ease) * s.maskRect.newX
			s.sprite.x += (s.sprite.toX - s.sprite.x) * 0.2
			this.drawCenteredMaskRect(s.maskRect.g, maskRectX, 0, s.maskRect.width, s.maskRect.height)
		}
		this.slideshowContainer.scale.x += (this.slideshowContainer.scaleXY - this.slideshowContainer.scale.x) * 0.08
		this.slideshowContainer.scale.y += (this.slideshowContainer.scaleXY - this.slideshowContainer.scale.y) * 0.08
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
		this.slideshowContainer.scale.x = 1.4
		this.slideshowContainer.scale.y = 1.4
		this.slideshowContainer.scaleXY = 1.05
	}
	applyValuesToSlides() {
		var windowW = AppStore.Window.w
		var windowH = AppStore.Window.h
		var currentPosX = 0
		for (var i = 0; i < this.slides.length; i++) {
			var s = this.slides[i]
			this.applyResponsiveImgToSlideDependsWindow(s)
			var hightlightedSlideW = windowW * (1 - (AppConstants.LANDING_NORMAL_SLIDE_PERCENTAGE * 2))
			var normalSlideW = windowW * AppConstants.LANDING_NORMAL_SLIDE_PERCENTAGE
			var slideW = 0
			if(s.highlight) slideW = hightlightedSlideW
			else slideW = normalSlideW
			this.resizeAndPositionImgSprite(s, slideW, windowW, windowH)
			// var displacementVars = this.displacementOffsets[s.id]
			// s.displacementSprite.x = (slideW >> 1) + displacementVars[0]
			// s.displacementSprite.y = (windowH >> 1) + displacementVars[1]
			// s.displacementSprite.xPos = s.displacementSprite.x
			// s.displacementSprite.yPos = s.displacementSprite.y
			// s.displacementSprite.scale.x = displacementVars[2]
			// s.displacementSprite.scale.y = displacementVars[3]
			// s.displacementSprite.alpha = 0.5
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
	positionTitlesContainer() {
		var windowW = AppStore.Window.w
		var windowH = AppStore.Window.h
		clearTimeout(this.titleTimeout)
		this.titleTimeout = setTimeout(()=>{
			var compassSize = (windowH * AppConstants.COMPASS_SIZE_PERCENTAGE) << 1
			var topOffset = (windowH >> 1) + (compassSize >> 1)
			var titlesContainerCss = {
				top: topOffset + ((windowH - topOffset) >> 1) - (this.titleContainer.parent.height() * 0.6),
				left: (windowW >> 1) - (this.titleContainer.parent.width() >> 1),
			}
			this.titleContainer.parent.css(titlesContainerCss)
		}, 0)
	}
	resize() {
		this.applyValuesToSlides()
		this.positionTitlesContainer()
	}
	componentWillUnmount() {

		var slides = this.slides
	 	for (var i = 0; i < slides.length; i++) {
	 		var s = slides[i]

	 		s.maskRect.g.clear()
	 		AppStore.releaseGraphics(s.maskRect.g)

	 		s.sprite.texture.destroy(true)
	 		AppStore.releaseSprite(s.sprite)

	 		s.wrapperContainer.removeChildren()
	 		AppStore.releaseContainer(s.wrapperContainer)
	 	}

	 	this.slides.length = 0
	 	this.planetNameTween = null

		this.slideshowContainer.removeChildren()
		AppStore.releaseContainer(this.slideshowContainer)

		this.slideshowWrapper.removeChildren()
		AppStore.releaseContainer(this.slideshowWrapper)
		
	}
}
