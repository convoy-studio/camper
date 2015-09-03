import BaseCampaignPage from 'BaseCampaignPage'
import AppActions from 'AppActions'
import AppStore from 'AppStore'
import Router from 'Router'
import AppConstants from 'AppConstants'
import Utils from 'Utils'
import ArrowBtn from 'ArrowBtn'
import PlayBtn from 'PlayBtn'
import RectangleBtn from 'RectangleBtn'
import TitleSwitcher from 'TitleSwitcher'
import CompassesContainer from 'CompassesContainer'

export default class PlanetCampaignPage extends BaseCampaignPage {
	constructor(props) {
		props.data['empty-image'] = AppStore.getEmptyImgUrl()
		super(props)
		this.productId = undefined
		this.fromInternalChange = false
		this.currentIndex = 0
		this.direction = AppConstants.LEFT
		this.currentProductContainerClass = 'product-container-b'
		this.timeoutTime = 1000
	}
	componentDidMount() {
		this.updateProductData()

		this.infos = AppStore.generalInfosLangScope()

		var slideshowTitle = this.child.find('.slideshow-title')
		var planetTitle = slideshowTitle.find('.planet-title')
		var planetName = slideshowTitle.find('.planet-name')
	 	this.titleContainer = {
	 		parent: slideshowTitle,
	 		planetTitle: planetTitle,
	 		planetName: planetName
	 	}

	 	this.planetNameTween = TweenMax.fromTo(planetName, 0.5, {scaleX:1.4, scaleY:0, opacity:0}, { scale:1, opacity:1, force3D:true, ease:Elastic.easeOut })
	 	this.planetNameTween.pause(0)

		var productContainersWrapper = this.child.find('.product-containers-wrapper')
		var containerA = productContainersWrapper.find('.product-container-a')
		var containerB = productContainersWrapper.find('.product-container-b')

		this.containers = {
			'product-container-a': {
				el: containerA,
				posterWrapper: containerA.find('.poster-wrapper'),
				posterImg: containerA.find('img'),
				spinner: {
					el: containerA.find('.spinner-wrapper'),
					svg: containerA.find('.spinner-wrapper svg'),
					path: containerA.find('.spinner-wrapper svg path')
				},
				video: {
					playBtn: new PlayBtn(containerA.find('.play-btn')).componentDidMount(),
					el: containerA.find('.video-wrapper'),
					container: containerA.find('.video-container'),
				}
			},
			'product-container-b': {
				el: containerB,
				posterWrapper: containerB.find('.poster-wrapper'),
				posterImg: containerB.find('img'),
				spinner: {
					el: containerB.find('.spinner-wrapper'),
					svg: containerB.find('.spinner-wrapper svg'),
					path: containerB.find('.spinner-wrapper svg path')
				},
				video: {
					playBtn: new PlayBtn(containerB.find('.play-btn')).componentDidMount(),
					el: containerB.find('.video-wrapper'),
					container: containerB.find('.video-container'),
				}
			}
		}

		this.arrowClicked = this.arrowClicked.bind(this)
		this.onPlanetClicked = this.onPlanetClicked.bind(this)
		this.bottomClicked = this.bottomClicked.bind(this)

		this.previousBtn = new ArrowBtn(this.child.find('.previous-btn'), AppConstants.LEFT)
		this.previousBtn.btnClicked = this.arrowClicked
		this.previousBtn.componentDidMount()
		this.nextBtn = new ArrowBtn(this.child.find('.next-btn'), AppConstants.RIGHT)
		this.nextBtn.btnClicked = this.arrowClicked
		this.nextBtn.componentDidMount()

		this.downBtn = new ArrowBtn(this.child.find('.down-btn'), AppConstants.BOTTOM)
		this.downBtn.btnClicked = this.bottomClicked
		this.downBtn.componentDidMount()

		if(AppStore.Detector.oldIE || AppStore.Detector.isMobile) {
			this.downBtn.element.css('display','none')
		}

		this.buyBtn = new TitleSwitcher(this.child.find('.buy-btn'), this.child.find('.dots-rectangle-btn'), this.infos['buy_title'])
		this.buyBtn.componentDidMount()

		if(!AppStore.Detector.isMobile) {
			this.compassesContainer = new CompassesContainer(this.pxScrollContainer, this.child.find(".interface.absolute"))
			this.compassesContainer.id = this.id
			this.compassesContainer.componentDidMount()
		}

		this.onVideoMouseEnter = this.onVideoMouseEnter.bind(this)
		this.onVideoMouseLeave = this.onVideoMouseLeave.bind(this)
		this.onVideoClick = this.onVideoClick.bind(this)

		this.checkCurrentProductByUrl()
		this.updateColors()
		$(document).on('keydown', this.onKeyPressed)

		this.updateTitles(this.infos.planet.toUpperCase(), this.id.toUpperCase())

		super.componentDidMount()
	}
	addVideoEvents() {
		if(this.currentContainer == undefined) return
		this.currentContainer.video.el.on('mouseenter', this.onVideoMouseEnter)
		this.currentContainer.video.el.on('mouseleave', this.onVideoMouseLeave)
		this.currentContainer.video.el.on('click', this.onVideoClick)
	}
	removeVideoEvents() {
		if(this.currentContainer == undefined) return
		this.currentContainer.video.el.off('mouseenter', this.onVideoMouseEnter)
		this.currentContainer.video.el.off('mouseleave', this.onVideoMouseLeave)
		this.currentContainer.video.el.off('click', this.onVideoClick)
	}
	onVideoMouseEnter(e) {
		e.preventDefault()
		this.currentContainer.video.playBtn.mouseOver()
	}
	onVideoMouseLeave(e) {
		e.preventDefault()
		this.currentContainer.video.playBtn.mouseOut()
	}
	onVideoClick(e) {
		e.preventDefault()
		this.assignVideoToNewContainer()
		this.currentContainer.video.playBtn.close()
	}
	updateTitles(title, name) {
		var planetTitle = this.titleContainer.planetTitle
		var planetName = this.titleContainer.planetName
	 	planetTitle.text(title)
	 	planetName.text(name)
	 	this.planetNameTween.play(0)
	}
	updateProductData() {
		this.products = AppStore.productsDataById(this.id)
	}
	onPlanetClicked() {
		var url = "/landing"
		Router.setHash(url)
	}
	arrowClicked(direction) {
		if(this.animationRunning) return
		this.switchSlideByDirection(direction)
	}
	bottomClicked() {
		this.scrollTargetChanged(this.pageHeight)
	}
	onKeyPressed(e) {
		if(this.animationRunning) return
	    e.preventDefault()
		switch(e.which) {
	        case 37: // left
	        	this.switchSlideByDirection(AppConstants.LEFT)
	        	break;
	        case 39: // right
	        	this.switchSlideByDirection(AppConstants.RIGHT)
	        	break;
	        case 38: // up
	        	break;
	        case 40: // down
	        	break;
	        default: return;
	    }
	}
	switchSlideByDirection(direction) {
		switch(direction) {
			case AppConstants.LEFT:
				this.previous()
				break
			case AppConstants.RIGHT:
				this.next()
				break
		}
		if(this.currentIndex > this.products.length-1) {
			var nextId = AppStore.getNextPlanet(this.id)
			var nexturl = "/planet/" + nextId + '/0'
			Router.setHash(nexturl)
			return
		}else if(this.currentIndex < 0) {
			var previousId = AppStore.getPreviousPlanet(this.id)
			var productsData = AppStore.productsDataById(previousId)
			var previousurl = "/planet/" + previousId + '/' + (productsData.length-1).toString()
			Router.setHash(previousurl)
			return
		}
		this.updateHasher()
	}
	updateHasher() {
		var url = "/planet/" + this.id + '/' + this.currentIndex
		Router.setHash(url)
	}
	next() {
		this.direction = AppConstants.LEFT
		this.currentIndex += 1
	}
	previous() {
		this.direction = AppConstants.RIGHT
		this.currentIndex -= 1
	}
	getCurrentIndexFromProductId(productId) {
		for (var i = 0; i < this.products.length; i++) {
			if(this.products[i].id == productId) {
				return i
			}
		}
	}
	internalHasherChanged() {
		var newId = AppStore.getPageId()
		if(newId != this.id) {
			this.updateTitles(this.infos.planet.toUpperCase(), newId.toUpperCase())
			this.positionTitlesContainer()
		}
		this.id = newId
		this.props.data = AppStore.pageContent()

		this.updateProductData()
		this.fromInternalChange = true
		this.checkCurrentProductByUrl()

		if(!AppStore.Detector.isMobile) {
			this.compassesContainer.currentIndex = this.currentIndex
			this.compassesContainer.changeData(this.id)
		}
		this.updateColors()
	}
	checkCurrentProductByUrl() {
		var newHasher = Router.getNewHash()
		var productId = parseInt(newHasher.targetId, 10)
		this.currentIndex = this.getCurrentIndexFromProductId(productId)
		this.showProductById(productId)
	}
	updateColors() {
		var color = this.products[this.currentIndex].color
		this.buyBtn.updateColor(color)
		var c = color.replace('0x', '#')
		this.currentContainer.spinner.path.css('fill', c)
		this.currentContainer.video.el.css('background-color', c)

		this.currentContainer.video.playBtn.open()

		var $buyBtn = this.buyBtn.element
		var buyUrl = 'http://www.camper.com/'+JS_lang+'_'+JS_country+this.products[this.currentIndex]['product-url']
		$buyBtn.attr('href', buyUrl)
	}
	showProductById(id) {
		this.animationRunning = true
		this.productId = id
		this.currentProductContainerClass = (this.currentProductContainerClass === 'product-container-a') ? 'product-container-b' : 'product-container-a'
		this.previousContainer = this.currentContainer
		this.removeVideoEvents()
		this.currentContainer = this.containers[this.currentProductContainerClass]
		this.addVideoEvents()
		
		this.assignAssetsToNewContainer()
		this.resizeVideoWrapper()
		this.resizePosterWrappers()
		this.animateContainers()

		this.updatePageHeight()
	}
	assignAssetsToNewContainer() {
		var productScope = AppStore.getSpecificProductById(this.id, this.productId)
		var imgSize = AppStore.responsivePosterImage()
		var imgSrc = AppStore.getEnvironment().static + 'image/planets/' + this.id + '/' + productScope['id'] + '-' + imgSize + '.jpg'

		this.currentContainer.posterImg.attr('src', this.props.data['empty-image'])
		this.currentContainer.posterImg.removeClass('opened')
		this.currentContainer.spinner.el.removeClass('closed')
		var img = new Image()
		img.onload = ()=> {
			this.currentContainer.posterImg.attr('src', imgSrc)
			this.currentContainer.spinner.el.addClass('closed')
			this.currentContainer.posterImg.addClass('opened')
		}
		img.src = imgSrc

		this.buyBtn.update(this.infos.buy_title + ' ' + productScope.name)
	}
	assignVideoToNewContainer() {
		this.currentContainer.video.container.removeClass('opened')

		var productScope = AppStore.getSpecificProductById(this.id, this.productId)
		var videoId = productScope['video-id']
		var frameUUID = Utils.UUID()
		var iframeStr = '<iframe src="//fast.wistia.net/embed/iframe/'+videoId+'" id="'+frameUUID+'" allowtransparency="false" frameborder="0" scrolling="yes" class="wistia_embed" name="wistia_embed" allowfullscreen mozallowfullscreen webkitallowfullscreen oallowfullscreen msallowfullscreen width="100%" height="100%"></iframe>'
		var iframe = $(iframeStr)
		this.currentContainer.video.uuid = frameUUID
		this.currentContainer.video.container.html(iframe)
		this.currentContainer.videoIsAdded = true

		this.currentContainer.video.container.addClass('opened')
		this.currentContainer.video.el.css('background-color', 'transparent')

		// setTimeout(()=>{
		// 	var wistiaEmbed = $('#'+frameUUID)[0].wistiaApi
		// 	wistiaEmbed.bind("end", ()=> {
		// 		alert("The video ended!");
		// 	});
		// }, 2000)
	}
	animateContainers() {
		var windowW = AppStore.Window.w
		var windowH = AppStore.Window.h
		var dir = (this.direction == AppConstants.LEFT) ? 1 : -1
		var time = (this.previousContainer == undefined) ? 0 : 1
		if(this.previousContainer != undefined) TweenMax.fromTo(this.previousContainer.el, 1, {x:0, opacity: 1}, { x:-windowW*dir, opacity: 1, force3D:true, ease:Expo.easeInOut })
		TweenMax.fromTo(this.currentContainer.el, time, {x:windowW*dir, opacity: 1}, { x:0, opacity: 1, force3D:true, ease:Expo.easeInOut })
		setTimeout(()=>{
			this.updateTopButtonsPositions()
			this.buyBtn.show()
		}, 200)
		setTimeout(()=>{
			this.animationRunning = false
			this.removePreviousContainerAssets()
			// this.assignVideoToNewContainer()
		}, this.timeoutTime)
	}
	removePreviousContainerAssets() {
		if(this.previousContainer == undefined) return
		this.previousContainer.posterImg.attr('src', this.props.data['empty-image'])
		this.previousContainer.video.container.html('')
		this.previousContainer.video.container.removeClass('opened')
		this.currentContainer.videoIsAdded = false
	}
	didTransitionInComplete() {
		if(!AppStore.Detector.isMobile) {
			this.compassesContainer.currentIndex = this.currentIndex
			this.compassesContainer.didTransitionInComplete()
		}
		super.didTransitionInComplete()
	}
	didTransitionOutComplete() {
		super.didTransitionOutComplete()
	}
	willTransitionOut() {
		if(!AppStore.Detector.isMobile) this.compassesContainer.willTransitionOut()
		super.willTransitionOut()
	}
	update() {
		if(!AppStore.Detector.isMobile) this.compassesContainer.update()
		super.update()
	}
	resizeVideoWrapper() {
		var windowW = AppStore.Window.w
		var windowH = AppStore.Window.h

		var orientation = (AppStore.Detector.isMobile) ? AppConstants.LANDSCAPE : undefined
		var scale = (AppStore.Detector.isMobile) ? 1 : 0.6

		var videoResize = Utils.ResizePositionProportionally(windowW * scale, windowH * scale, AppConstants.MEDIA_GLOBAL_W, AppConstants.MEDIA_GLOBAL_H, orientation)
		
		var videoTop = (windowH * 0.51) - (videoResize.height >> 1)
		videoTop = (AppStore.Detector.isMobile) ? 220 : videoTop

		this.videoCss = {
			width: videoResize.width,
			height: videoResize.height,
			top: videoTop,
			left: (windowW >> 1) - (videoResize.width >> 1)	
		}
		this.currentContainer.video.el.css(this.videoCss)
		this.videoTotalHeight = (this.videoCss.top << 1) + this.videoCss.height
	}
	resizePosterWrappers() {
		var windowW = AppStore.Window.w
		var windowH = AppStore.Window.h

		var orientation = (AppStore.Detector.isMobile) ? AppConstants.LANDSCAPE : undefined
		var scale = (AppStore.Detector.isMobile) ? 1 : 0.6

		var imageResize = Utils.ResizePositionProportionally(windowW * scale, windowH * scale, AppConstants.CAMPAIGN_IMAGE_SIZE[0], AppConstants.CAMPAIGN_IMAGE_SIZE[1], orientation)
		
		var posterTop = (this.compassPadding << 1) + windowH + this.videoCss.top
		posterTop = (AppStore.Detector.isMobile) ? this.videoCss.top + this.videoCss.height + 136 : posterTop
		
		this.posterImgCss = {
			width: imageResize.width,
			height: imageResize.height,
			top: posterTop,
			left: (windowW >> 1) - (imageResize.width >> 1)
		}

		if(this.previousContainer != undefined) this.previousContainer.el.css('z-index', 1)
		this.currentContainer.el.css('z-index', 2)
		this.currentContainer.posterWrapper.css(this.posterImgCss)

		this.posterTotalHeight = (this.videoCss.top << 1) + this.posterImgCss.height
	}
	updateTopButtonsPositions() {
		var windowW = AppStore.Window.w
		var windowH = AppStore.Window.h
		
		var buyTopPos = (this.posterImgCss.top + this.posterImgCss.height) + ((this.pageHeight - ((this.posterImgCss.top) + this.posterImgCss.height)) >> 1) - (this.buyBtn.height) - (this.buyBtn.height >> 1) - (this.buyBtn.height * 0.4)
		buyTopPos = (AppStore.Detector.isMobile) ? this.videoCss.top + this.videoCss.height + 40 : buyTopPos
		
		this.buyBtn.position(
			(windowW >> 1) - (this.buyBtn.width >> 1),
			buyTopPos
		)

		var downTopPos = (this.videoCss.top + this.videoCss.height) + ((windowH - ((this.videoCss.top) + this.videoCss.height)) >> 1) - (this.downBtn.height >> 1)
		downTopPos = (AppStore.Detector.isMobile) ? this.videoCss.top + this.videoCss.height + 40 : downTopPos

		this.downBtn.position(
			(windowW >> 1) - (this.downBtn.width >> 1),
			downTopPos
		)
	}
	resizeCompassContainer() {
		var windowW = AppStore.Window.w
		var windowH = AppStore.Window.h
		this.compassesContainer.resize()
		this.compassPadding = 140
		this.compassesContainer.position(
			(windowW >> 1) - (this.compassesContainer.width >> 1),
			(windowH) + this.compassPadding + (this.compassPadding * 0.3)
		)
	}
	updatePageHeight() {
		this.pageHeight = this.videoTotalHeight + this.posterTotalHeight + (this.compassPadding << 1)
	}
	positionTitlesContainer() {
		var windowW = AppStore.Window.w
		var windowH = AppStore.Window.h
		clearTimeout(this.titleTimeout)
		this.titleTimeout = setTimeout(()=>{
			var compassSize = (windowH * AppConstants.COMPASS_SIZE_PERCENTAGE) << 1
			var topOffset = (windowH >> 1) + (compassSize >> 1)
			var topPos = (this.videoCss.top >> 1) - (this.titleContainer.parent.height() >> 1)
			topPos += (AppStore.Detector.isMobile) ? 30 : 0
			var titlesContainerCss = {
				top: topPos,
				left: (windowW >> 1) - (this.titleContainer.parent.width() >> 1),
			}
			this.titleContainer.parent.css(titlesContainerCss)
		}, 0)
	}
	resize() {

		var windowW = AppStore.Window.w
		var windowH = AppStore.Window.h

		if(!AppStore.Detector.isMobile) this.resizeCompassContainer()
		this.positionTitlesContainer()
		this.resizeVideoWrapper()
		this.resizePosterWrappers()
		this.updatePageHeight()
		this.updateTopButtonsPositions()

		var previousXPos = (AppStore.Detector.isMobile) ? 0 : (this.videoCss.left >> 1) - (this.previousBtn.width >> 1) - 4
		var nextXPos = (AppStore.Detector.isMobile) ? windowW - this.previousBtn.width : (this.videoCss.left + this.videoCss.width) + ((windowW - (this.videoCss.left + this.videoCss.width)) >> 1) - (this.nextBtn.width >> 1) + 4

		if(AppStore.Detector.oldIE) {
			previousXPos += 40
			nextXPos -= 40
		}

		this.previousBtn.position(
			previousXPos,
			(windowH >> 1) - (this.previousBtn.height >> 1)
		)
		this.nextBtn.position(
			nextXPos,
			(windowH >> 1) - (this.previousBtn.height >> 1)
		)

		var childCss = {
			width: windowW,
		}
		this.child.css(childCss)

		super.resize()
	}
	componentWillUnmount() {
		$(document).off('keydown', this.onKeyPressed)
		clearTimeout(this.videoAssignTimeout)
		if(!AppStore.Detector.isMobile) this.compassesContainer.componentWillUnmount()
		this.containers['product-container-a'].video.playBtn.componentWillUnmount()
		this.containers['product-container-b'].video.playBtn.componentWillUnmount()
		this.removeVideoEvents()
		this.previousBtn.componentWillUnmount()
		this.nextBtn.componentWillUnmount()
		this.buyBtn.componentWillUnmount()
		this.downBtn.componentWillUnmount()
		super.componentWillUnmount()
	}
}
