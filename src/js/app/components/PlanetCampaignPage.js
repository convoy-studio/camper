import BasePlanetPage from 'BasePlanetPage'
import AppActions from 'AppActions'
import AppStore from 'AppStore'
import Router from 'Router'
// import Compass from 'Compass'
import AppConstants from 'AppConstants'
import Utils from 'Utils'
import ArrowBtn from 'ArrowBtn'
import RectangleBtn from 'RectangleBtn'
import TitleSwitcher from 'TitleSwitcher'

export default class PlanetCampaignPage extends BasePlanetPage {
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
		this.animations = {
			oldContainerAnimation: undefined,
			newContainerAnimation: undefined
		}

		this.products = AppStore.productsDataById(this.id)

		var infos = AppStore.generalInfosLangScope()
		var productContainersWrapper = this.child.find('.product-containers-wrapper')
		var containerA = productContainersWrapper.find('.product-container-a')
		var containerB = productContainersWrapper.find('.product-container-b')
		this.containers = {
			'product-container-a': {
				el: containerA,
				posterWrapper: containerA.find('.poster-wrapper'),
				posterImg: containerA.find('img'),
				videoWrapper: containerA.find('.video-wrapper')
			},
			'product-container-b': {
				el: containerB,
				posterWrapper: containerB.find('.poster-wrapper'),
				posterImg: containerB.find('img'),
				videoWrapper: containerB.find('.video-wrapper')
			}
		}

		this.arrowClicked = this.arrowClicked.bind(this)
		this.onDownClicked = this.onDownClicked.bind(this)
		this.onBuyClicked = this.onBuyClicked.bind(this)
		this.onPlanetClicked = this.onPlanetClicked.bind(this)

		this.previousBtn = new ArrowBtn(this.child.find('.previous-btn'), AppConstants.LEFT)
		this.previousBtn.btnClicked = this.arrowClicked
		this.previousBtn.componentDidMount()
		this.nextBtn = new ArrowBtn(this.child.find('.next-btn'), AppConstants.RIGHT)
		this.nextBtn.btnClicked = this.arrowClicked
		this.nextBtn.componentDidMount()
		this.downBtn = new ArrowBtn(this.child.find('.down-btn'), AppConstants.BOTTOM)
		this.downBtn.btnClicked = this.onDownClicked
		this.downBtn.componentDidMount()

		this.buyBtn = new RectangleBtn(this.child.find('.buy-btn'), infos.buy_title)
		this.buyBtn.btnClicked = this.onBuyClicked
		this.buyBtn.componentDidMount()

		this.planetBtn = new RectangleBtn(this.child.find('.planet-btn'), this.id)
		this.planetBtn.btnClicked = this.onPlanetClicked
		this.planetBtn.componentDidMount()

		this.productTitle = new TitleSwitcher(this.child.find('.product-title-wrapper'))
		this.productTitle.componentDidMount()

		// this.compass = new Compass(this.pxContainer, AppConstants.CAMPAIGN)
		// this.compass.knotRadius = AppConstants.SMALL_KNOT_RADIUS
		// this.compass.componentDidMount()

		this.checkCurrentProductByUrl()
		$(document).on('keydown', this.onKeyPressed)

		super.componentDidMount()
	}
	onPlanetClicked() {
		var url = "/planet/" + this.id
		Router.setHash(url)
	}
	onDownClicked() {
		if(this.animationRunning) return
		this.animationRunning = true
		var windowH = AppStore.Window.h
		if(this.isInVideo) {
			this.isInVideo = false
			TweenMax.to(this.currentContainer.el, 1, { y:0, force3D: true, ease:Expo.easeInOut })
			TweenMax.to(this.downBtn.element, 1, { rotation:'-90deg', force3D: true, ease:Expo.easeInOut })
		}else{
			this.isInVideo = true
			TweenMax.to(this.currentContainer.el, 1, { y:-windowH, force3D: true, ease:Expo.easeInOut })
			TweenMax.to(this.downBtn.element, 1, { rotation:'90deg', force3D: true, ease:Expo.easeInOut })
		}
		clearTimeout(this.videoAssignTimeout)
		setTimeout(()=>{
			this.animationRunning = false
		}, this.timeoutTime)
		if(this.currentContainer.videoIsAdded != true) {
			this.videoAssignTimeout = setTimeout(()=>{
				this.assignVideoToNewContainer()
			}, this.timeoutTime)
		}
	}
	onBuyClicked() {
		console.log('buy')
	}
	arrowClicked(direction) {
		if(this.animationRunning) return
		switch(direction) {
			case AppConstants.LEFT:
				this.previous()
				break
			case AppConstants.RIGHT:
				this.next()
				break
		}
		this.updateHasher()
	}
	onKeyPressed(e) {
		if(this.animationRunning) return
	    e.preventDefault()
		switch(e.which) {
	        case 37: // left
	        	this.previous()
	        	this.updateHasher()
	        	break;
	        case 39: // right
	        	this.next()
	        	this.updateHasher()
	        	break;
	        case 38: // up
	        	this.onDownClicked()
	        	break;
	        case 40: // down
	        	this.onDownClicked()
	        	break;
	        default: return;
	    }
	}
	updateHasher() {
		var url = "/planet/" + this.id + '/' + this.currentIndex
		Router.setHash(url)
	}
	next() {
		this.direction = AppConstants.LEFT
		this.currentIndex += 1
		this.currentIndex = (this.currentIndex > this.products.length-1) ? 0 : this.currentIndex
	}
	previous() {
		this.direction = AppConstants.RIGHT
		this.currentIndex -= 1
		this.currentIndex = (this.currentIndex < 0) ? this.products.length-1 : this.currentIndex
	}
	getCurrentIndexFromProductId(productId) {
		for (var i = 0; i < this.products.length; i++) {
			if(this.products[i].id == productId) {
				return i
			}
		}
	}
	internalHasherChanged() {
		this.fromInternalChange = true
		this.checkCurrentProductByUrl()
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
	}
	assignAssetsToNewContainer() {
		var productScope = AppStore.getSpecificProductById(this.id, this.productId)
		var imgSrc = AppStore.getEnvironment().static + '/image/planets/' + this.id + '/' + productScope['visual-id'] + '-XL' + '.jpg'
		this.currentContainer.posterImg.attr('src', imgSrc)
		this.productTitle.update(productScope.name)
	}
	assignVideoToNewContainer() {
		var videoId = 136080598
		var videoW = '100%'
		var videoH = '100%'
		var iframeStr = '<iframe src="https://player.vimeo.com/video/'+videoId+'?title=0&byline=0&portrait=0" width="'+videoW+'" height="'+videoH+'" frameborder="0" webkitallowfullscreen mozallowfullscreen allowfullscreen></iframe>'
		this.currentContainer.videoWrapper.html(iframeStr)
		this.currentContainer.videoIsAdded = true
	}
	animateContainers() {
		var windowW = AppStore.Window.w
		var windowH = AppStore.Window.h
		var dir = (this.direction == AppConstants.LEFT) ? 1 : -1
		if(this.previousContainer != undefined) TweenMax.fromTo(this.previousContainer.el, 1, {x:0, opacity: 1}, { x:-windowW*dir, opacity: 1, force3D:true, ease:Expo.easeInOut })
		TweenMax.fromTo(this.currentContainer.el, 1, {x:windowW*dir, opacity: 1}, { x:0, opacity: 1, force3D:true, ease:Expo.easeInOut })

		setTimeout(()=>{
			this.updateTopButtonsPositions()
			this.productTitle.show()
		}, 200)

		setTimeout(()=>{
			this.animationRunning = false
			this.removePreviousContainerAssets()
		}, this.timeoutTime)
		clearTimeout(this.videoAssignTimeout)
		if(this.isInVideo) {
			this.videoAssignTimeout = setTimeout(()=>{
				this.assignVideoToNewContainer()
			}, this.timeoutTime)
		}
	}
	removePreviousContainerAssets() {
		if(this.previousContainer == undefined) return
		this.previousContainer.videoWrapper.html('')
		this.currentContainer.videoIsAdded = false
	}
	didTransitionInComplete() {
		// var planetData = AppStore.productsDataById(this.id)
		// this.compass.updateData(planetData)
		super.didTransitionInComplete()
	}
	didTransitionOutComplete() {
		super.didTransitionOutComplete()
	}
	update() {
		// this.compass.update()
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
			top: windowH + (windowH * 0.51) - (videoResize.height >> 1),
			left: (windowW >> 1) - (videoResize.width >> 1)	
		}
		if(this.isInVideo) TweenMax.set(this.currentContainer.el, { y:-windowH })
		else TweenMax.set(this.currentContainer.el, { y:0 })
		if(this.previousContainer != undefined) this.previousContainer.el.css('z-index', 1)
		this.currentContainer.el.css('z-index', 2)
		this.currentContainer.posterWrapper.css(this.posterImgCss)
		this.currentContainer.videoWrapper.css(videoCss)
	}
	updateTopButtonsPositions() {
		var windowW = AppStore.Window.w
		var windowH = AppStore.Window.h
		this.productTitle.position(
			(windowW >> 1) - (this.productTitle.width >> 1),
			(this.posterImgCss.top >> 1) - (this.productTitle.height * 0.4)
		)
		this.planetBtn.position(
			this.productTitle.x - this.planetBtn.width - AppConstants.PADDING_AROUND,
			this.productTitle.y
		)
		this.buyBtn.position(
			this.productTitle.x + this.productTitle.width + AppConstants.PADDING_AROUND,
			this.productTitle.y
		)
	}
	resize() {
		var windowW = AppStore.Window.w
		var windowH = AppStore.Window.h

		// this.compass.resize()
		// this.compass.position(
		// 	windowW >> 1, windowH * 0.16
		// )

		this.resizeMediaWrappers()

		this.previousBtn.position(
			(this.posterImgCss.left >> 1) - (this.previousBtn.width >> 1) - 4,
			(windowH >> 1) - (this.previousBtn.width >> 1)
		)
		this.nextBtn.position(
			(this.posterImgCss.left + this.posterImgCss.width) + ((windowW - (this.posterImgCss.left + this.posterImgCss.width)) >> 1) - (this.nextBtn.width >> 1) + 4,
			(windowH >> 1) - (this.previousBtn.height >> 1)
		)
		this.downBtn.position(
			(windowW >> 1) - (this.downBtn.width >> 1),
			this.posterImgCss.top + this.posterImgCss.height + ((windowH - (this.posterImgCss.top + this.posterImgCss.height)) >> 1) - (this.downBtn.height >> 1)
		)

		this.updateTopButtonsPositions()

		var childCss = {
			width: windowW,
			height: windowH
		}
		this.child.css(childCss)

		super.resize()
	}
	componentWillUnmount() {
		$(document).off('keydown', this.onKeyPressed)
		clearTimeout(this.videoAssignTimeout)
		// this.compass.componentWillUnmount()
		this.previousBtn.componentWillUnmount()
		this.nextBtn.componentWillUnmount()
		this.downBtn.componentWillUnmount()
		this.buyBtn.componentWillUnmount()
		super.componentWillUnmount()
	}
}
