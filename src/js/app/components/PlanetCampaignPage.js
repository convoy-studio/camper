import BaseCampaignPage from 'BaseCampaignPage'
import AppActions from 'AppActions'
import AppStore from 'AppStore'
import Router from 'Router'
import AppConstants from 'AppConstants'
import Utils from 'Utils'
import ArrowBtn from 'ArrowBtn'
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

		// this.planetTitleTxt = this.infos.planet.toUpperCase()
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
				videoWrapper: containerA.find('.video-wrapper'),
			},
			'product-container-b': {
				el: containerB,
				posterWrapper: containerB.find('.poster-wrapper'),
				posterImg: containerB.find('img'),
				videoWrapper: containerB.find('.video-wrapper'),
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

		// this.buyBtn = new RectangleBtn(this.child.find('.buy-btn'), this.infos.buy_title)
		// this.buyBtn.btnClicked = this.onBuyClicked
		// this.buyBtn.componentDidMount()

		// this.planetBtn = new RectangleBtn(this.child.find('.planet-btn'), this.id)
		// this.planetBtn.btnClicked = this.onPlanetClicked
		// this.planetBtn.componentDidMount()

		this.productTitle = new TitleSwitcher(this.child.find('.product-title-wrapper'))
		this.productTitle.componentDidMount()

		this.compassesContainer = new CompassesContainer(this.pxScrollContainer, this.child.find(".interface.absolute"))
		this.compassesContainer.id = this.id
		this.compassesContainer.componentDidMount()

		this.checkCurrentProductByUrl()
		$(document).on('keydown', this.onKeyPressed)

		this.updateTitles(this.infos.planet.toUpperCase(), this.id.toUpperCase())

		super.componentDidMount()
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
	}
	checkCurrentProductByUrl() {
		var newHasher = Router.getNewHash()
		var productId = parseInt(newHasher.targetId, 10)
		this.currentIndex = this.getCurrentIndexFromProductId(productId)
		this.showProductById(productId)
	}
	showProductById(id) {
		this.animationRunning = true
		this.productId = id
		this.currentProductContainerClass = (this.currentProductContainerClass === 'product-container-a') ? 'product-container-b' : 'product-container-a'
		this.previousContainer = this.currentContainer
		this.currentContainer = this.containers[this.currentProductContainerClass]
		
		this.assignAssetsToNewContainer()
		this.resizeMediaWrappers()
		this.animateContainers()

		this.updatePageHeight()
	}
	assignAssetsToNewContainer() {
		var productScope = AppStore.getSpecificProductById(this.id, this.productId)
		var imgSrc = AppStore.getEnvironment().static + '/image/planets/' + this.id + '/' + productScope['id'] + '-XL' + '.jpg'
		this.currentContainer.posterImg.attr('src', imgSrc)
		this.productTitle.update(this.infos.buy_title + ' ' + productScope.name)
	}
	assignVideoToNewContainer() {
		var productScope = AppStore.getSpecificProductById(this.id, this.productId)
		var videoId = productScope['video-id']
		var iframeStr = '<iframe src="//fast.wistia.net/embed/iframe/'+videoId+'" allowtransparency="true" frameborder="0" scrolling="no" class="wistia_embed" name="wistia_embed" allowfullscreen mozallowfullscreen webkitallowfullscreen oallowfullscreen msallowfullscreen width="100%" height="100%"></iframe>'
		this.currentContainer.videoWrapper.html(iframeStr)
		this.currentContainer.videoIsAdded = true
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
			this.productTitle.show()
		}, 200)
		setTimeout(()=>{
			this.animationRunning = false
			this.removePreviousContainerAssets()
		}, this.timeoutTime)
		setTimeout(()=>{
			this.assignVideoToNewContainer()
		}, this.timeoutTime + 200)
	}
	removePreviousContainerAssets() {
		if(this.previousContainer == undefined) return
		this.previousContainer.videoWrapper.html('')
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
		this.currentContainer.videoWrapper.css(videoCss)

		this.videoTotalHeight = (this.posterImgCss.top << 1) + videoCss.height
		this.posterTotalHeight = (this.posterImgCss.top << 1) + this.posterImgCss.height
	}
	updateTopButtonsPositions() {
		var windowW = AppStore.Window.w
		var windowH = AppStore.Window.h
		this.productTitle.position(
			(windowW >> 1) - (this.productTitle.width >> 1),
			(this.posterImgCss.top + this.posterImgCss.height) + ((windowH - (this.posterImgCss.top + this.posterImgCss.height)) >> 1) - (this.productTitle.height) - (this.productTitle.height >> 1)
		)
		// this.planetBtn.position(
		// 	this.productTitle.x - this.planetBtn.width - (AppConstants.PADDING_AROUND << 1),
		// 	this.productTitle.y
		// )
		// this.buyBtn.position(
		// 	this.productTitle.x + this.productTitle.width + (AppConstants.PADDING_AROUND << 1),
		// 	this.productTitle.y
		// )
	}
	resizeCompassContainer() {
		var windowW = AppStore.Window.w
		var windowH = AppStore.Window.h
		this.compassesContainer.resize()
		this.compassPadding = 140
		this.compassesContainer.position(
			(windowW >> 1) - (this.compassesContainer.width >> 1),
			(windowH) + this.compassPadding + 10
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
		// this.buyBtn.componentWillUnmount()
		// this.planetBtn.componentWillUnmount()
		super.componentWillUnmount()
	}
}
