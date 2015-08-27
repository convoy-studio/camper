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
		this.isInVideo = false
		this.timeoutTime = 900
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
					el: containerA.find('.video-wrapper'),
					play: containerA.find('.play-btn'),
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
					el: containerB.find('.video-wrapper'),
					play: containerB.find('.play-btn'),
					container: containerB.find('.video-container'),
				}
			}
		}

		this.arrowClicked = this.arrowClicked.bind(this)
		this.onBuyClicked = this.onBuyClicked.bind(this)
		this.onPlanetClicked = this.onPlanetClicked.bind(this)

		this.previousBtn = new ArrowBtn(this.child.find('.previous-btn'), AppConstants.LEFT)
		this.previousBtn.btnClicked = this.arrowClicked
		this.previousBtn.componentDidMount()
		this.nextBtn = new ArrowBtn(this.child.find('.next-btn'), AppConstants.RIGHT)
		this.nextBtn.btnClicked = this.arrowClicked
		this.nextBtn.componentDidMount()

		this.buyBtn = new TitleSwitcher(this.child.find('.buy-btn'), this.child.find('.dots-rectangle-btn'), this.infos['buy_title'])
		this.buyBtn.onClick = this.onBuyClicked
		this.buyBtn.componentDidMount()

		this.playBtn = new PlayBtn(this.child.find('.play-btn'))
		this.playBtn.componentDidMount()

		this.compassesContainer = new CompassesContainer(this.pxScrollContainer, this.child.find(".interface.absolute"))
		this.compassesContainer.id = this.id
		this.compassesContainer.componentDidMount()

		// this.onVideoMouseEnter = this.onVideoMouseEnter.bind(this)
		// this.onVideoMouseLeave = this.onVideoMouseLeave.bind(this)
		// this.onVideoClick = this.onVideoClick.bind(this)

		this.checkCurrentProductByUrl()
		this.updateColors()
		$(document).on('keydown', this.onKeyPressed)

		this.updateTitles(this.infos.planet.toUpperCase(), this.id.toUpperCase())

		super.componentDidMount()
	}
	addVideoEvents() {
		// if(this.currentContainer == undefined) return
		// this.currentContainer.video.el.on('mouseenter', this.onVideoMouseEnter)
		// this.currentContainer.video.el.on('mouseleave', this.onVideoMouseLeave)
		// this.currentContainer.video.el.on('click', this.onVideoClick)
	}
	removeVideoEvents() {
		// if(this.currentContainer == undefined) return
		// this.currentContainer.video.el.off('mouseenter', this.onVideoMouseEnter)
		// this.currentContainer.video.el.off('mouseleave', this.onVideoMouseLeave)
		// this.currentContainer.video.el.off('click', this.onVideoClick)
	}
	onVideoMouseEnter(e) {
		e.preventDefault()
		this.currentContainer.video.play.addClass('hovered')
	}
	onVideoMouseLeave(e) {
		e.preventDefault()
		this.currentContainer.video.play.removeClass('hovered')
	}
	onVideoClick(e) {
		e.preventDefault()
		this.assignVideoToNewContainer()
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
	onBuyClicked() {
		console.log('buy')
	}
	arrowClicked(direction) {
		if(this.animationRunning) return
		this.switchSlideByDirection(direction)
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
		this.compassesContainer.currentIndex = this.currentIndex
		this.compassesContainer.changeData(this.id)
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
		this.resizeMediaWrappers()
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
		var iframeStr = '<iframe src="//fast.wistia.net/embed/iframe/'+videoId+'" id="'+frameUUID+'" allowtransparency="false" frameborder="0" scrolling="no" class="wistia_embed" name="wistia_embed" allowfullscreen mozallowfullscreen webkitallowfullscreen oallowfullscreen msallowfullscreen width="100%" height="100%"></iframe>'
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
		}, this.timeoutTime)
		setTimeout(()=>{
			this.assignVideoToNewContainer()
		}, this.timeoutTime + 500)
	}
	removePreviousContainerAssets() {
		if(this.previousContainer == undefined) return
		this.previousContainer.posterImg.attr('src', this.props.data['empty-image'])
		this.previousContainer.video.container.html('')
		this.previousContainer.video.container.removeClass('opened')
		this.currentContainer.videoIsAdded = false
	}
	didTransitionInComplete() {
		this.compassesContainer.currentIndex = this.currentIndex
		this.compassesContainer.didTransitionInComplete()
		super.didTransitionInComplete()
	}
	didTransitionOutComplete() {
		super.didTransitionOutComplete()
	}
	willTransitionOut() {
		this.compassesContainer.willTransitionOut()
		super.willTransitionOut()
	}
	update() {
		this.compassesContainer.update()
		super.update()
	}
	resizeMediaWrappers() {
		var windowW = AppStore.Window.w
		var windowH = AppStore.Window.h
		var imageResize = Utils.ResizePositionProportionally(windowW * 0.6, windowH * 0.6, AppConstants.CAMPAIGN_IMAGE_SIZE[0], AppConstants.CAMPAIGN_IMAGE_SIZE[1])
		var videoResize = Utils.ResizePositionProportionally(windowW * 0.6, windowH * 0.6, AppConstants.MEDIA_GLOBAL_W, AppConstants.MEDIA_GLOBAL_H)
		this.posterImgCss = {
			width: imageResize.width,
			height: imageResize.height,
			top: (windowH * 0.51) - (imageResize.height >> 1),
			left: (windowW >> 1) - (imageResize.width >> 1)
		}
		var videoCss = {
			width: videoResize.width,
			height: videoResize.height,
			top: (this.compassPadding << 1) + windowH + this.posterImgCss.top,
			left: (windowW >> 1) - (videoResize.width >> 1)	
		}
		if(this.isInVideo) TweenMax.set(this.currentContainer.el, { y:-windowH })
		else TweenMax.set(this.currentContainer.el, { y:0 })
		if(this.previousContainer != undefined) this.previousContainer.el.css('z-index', 1)
		this.currentContainer.el.css('z-index', 2)
		this.currentContainer.posterWrapper.css(this.posterImgCss)
		this.currentContainer.video.el.css(videoCss)

		this.videoTotalHeight = (this.posterImgCss.top << 1) + videoCss.height
		this.posterTotalHeight = (this.posterImgCss.top << 1) + this.posterImgCss.height
	}
	updateTopButtonsPositions() {
		var windowW = AppStore.Window.w
		var windowH = AppStore.Window.h
		this.buyBtn.position(
			(windowW >> 1) - (this.buyBtn.width >> 1),
			(this.posterImgCss.top + this.posterImgCss.height) + ((windowH - (this.posterImgCss.top + this.posterImgCss.height)) >> 1) - (this.buyBtn.height) - (this.buyBtn.height >> 1)
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
			var titlesContainerCss = {
				top: (this.posterImgCss.top >> 1) - (this.titleContainer.parent.height() >> 1),
				left: (windowW >> 1) - (this.titleContainer.parent.width() >> 1),
			}
			this.titleContainer.parent.css(titlesContainerCss)
		}, 0)
	}
	resize() {
		var windowW = AppStore.Window.w
		var windowH = AppStore.Window.h

		this.resizeCompassContainer()
		this.positionTitlesContainer()
		this.resizeMediaWrappers()
		this.updatePageHeight()
		this.previousBtn.position(
			(this.posterImgCss.left >> 1) - (this.previousBtn.width >> 1) - 4,
			(windowH >> 1) - (this.previousBtn.width >> 1)
		)
		this.nextBtn.position(
			(this.posterImgCss.left + this.posterImgCss.width) + ((windowW - (this.posterImgCss.left + this.posterImgCss.width)) >> 1) - (this.nextBtn.width >> 1) + 4,
			(windowH >> 1) - (this.previousBtn.height >> 1)
		)
		this.updateTopButtonsPositions()

		var childCss = {
			width: windowW,
		}
		this.child.css(childCss)

		super.resize()
	}
	componentWillUnmount() {
		$(document).off('keydown', this.onKeyPressed)
		clearTimeout(this.videoAssignTimeout)
		this.compassesContainer.componentWillUnmount()
		this.previousBtn.componentWillUnmount()
		this.nextBtn.componentWillUnmount()
		this.buyBtn.componentWillUnmount()
		super.componentWillUnmount()
	}
}
