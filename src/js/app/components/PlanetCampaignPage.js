import BasePlanetPage from 'BasePlanetPage'
import AppActions from 'AppActions'
import AppStore from 'AppStore'
import Router from 'Router'
// import Compass from 'Compass'
import AppConstants from 'AppConstants'
import Utils from 'Utils'

export default class PlanetCampaignPage extends BasePlanetPage {
	constructor(props) {
		props.data['empty-image'] = AppStore.getEmptyImgUrl()
		super(props)
		this.productId = undefined
		this.fromInternalChange = false
		this.currentIndex = 0
		this.direction = AppConstants.LEFT
		this.currentProductContainerClass = 'product-container-b'
	}
	componentDidMount() {
		this.g = new PIXI.Graphics()
		this.pxContainer.addChild(this.g)

		this.animations = {
			oldContainerAnimation: undefined,
			newContainerAnimation: undefined
		}

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

		// this.compass = new Compass(this.pxContainer, AppConstants.CAMPAIGN)
		// this.compass.knotRadius = AppConstants.SMALL_KNOT_RADIUS
		// this.compass.componentDidMount()

		this.products = AppStore.productsDataById(this.id)

		this.checkCurrentProductByUrl()
		$(document).on('keydown', this.onKeyPressed)

		super.componentDidMount()
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
	}
	assignVideoToNewContainer() {
		var videoId = 136080598
		var videoW = '100%'
		var videoH = '100%'
		var iframeStr = '<iframe src="https://player.vimeo.com/video/'+videoId+'?title=0&byline=0&portrait=0" width="'+videoW+'" height="'+videoH+'" frameborder="0" webkitallowfullscreen mozallowfullscreen allowfullscreen></iframe>'
		this.currentContainer.videoWrapper.html(iframeStr)
	}
	animateContainers() {
		var windowW = AppStore.Window.w
		var windowH = AppStore.Window.h
		var dir = (this.direction == AppConstants.LEFT) ? 1 : -1
		if(this.previousContainer != undefined) TweenMax.fromTo(this.previousContainer.el, 1, {x:0, opacity: 1}, { x:-windowW*dir, opacity: 1, force3D:true, ease:Expo.easeInOut })
		TweenMax.fromTo(this.currentContainer.el, 1, {x:windowW*dir, opacity: 1}, { x:0, opacity: 1, force3D:true, ease:Expo.easeInOut })
		clearTimeout(this.videoAssignTimeout)
		setTimeout(()=>{
			this.animationRunning = false
		}, 900)
		this.videoAssignTimeout = setTimeout(()=>{
			this.assignVideoToNewContainer()
		}, 1300)
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
		var posterImgCss = {
			width: imageResize.width,
			height: imageResize.height,
			top: (windowH >> 1) - (imageResize.height >> 1),
			left: (windowW >> 1) - (imageResize.width >> 1)
		}
		var videoCss = {
			width: videoResize.width,
			height: videoResize.height,
			top: windowH + (windowH >> 1) - (videoResize.height >> 1),
			left: (windowW >> 1) - (videoResize.width >> 1)	
		}

		if(this.previousContainer != undefined) this.previousContainer.el.css('z-index', 1)
		this.currentContainer.el.css('z-index', 2)
		this.currentContainer.posterWrapper.css(posterImgCss)
		this.currentContainer.videoWrapper.css(videoCss)
	}
	resize() {
		var windowW = AppStore.Window.w
		var windowH = AppStore.Window.h

		// this.compass.resize()
		// this.compass.position(
		// 	windowW >> 1, windowH * 0.16
		// )
		
		this.resizeMediaWrappers()
		
		var childCss = {
			width: windowW,
			height: windowH
		}
		this.child.css(childCss)

		// draw a rectangle
		this.g.clear()
		this.g.beginFill(Math.random() * 0x000000)
		this.g.drawRect(0, 0, windowW, windowH)
		this.g.endFill()

		super.resize()
	}
	componentWillUnmount() {
		$(document).off('keydown', this.onKeyPressed)
		// this.compass.componentWillUnmount()
	}
}
