import BaseComponent from 'BaseComponent'
import template from 'FrontContainer_hbs'
import AppStore from 'AppStore'
import AppConstants from 'AppConstants'
import AppActions from 'AppActions'

class FrontContainer extends BaseComponent {
	constructor() {
		super()
	}
	render(parent) {
		var scope = {}
		var generaInfos = AppStore.generalInfos()
		scope.infos = AppStore.generalInfosLangScope()
		scope.facebookUrl = generaInfos['facebook_url']
		scope.twitterUrl = generaInfos['twitter_url']
		scope.instagramUrl = generaInfos['instagram_url']
		scope.labUrl = generaInfos['lab_url']
		scope.menShopUrl = 'http://www.camper.com/'+JS_lang+'_'+JS_country+'/men/shoes/new-collection'
		scope.womenShopUrl = 'http://www.camper.com/'+JS_lang+'_'+JS_country+'/women/shoes/new-collection'
		scope.isMobile = (AppStore.Detector.oldIE) ? false : AppStore.Detector.isMobile

		if(scope.isMobile) {
			scope.mobileMenu = [
				{ id:'home', name:scope.infos['home_txt'], url:'#!/landing' },
				{ id:'shop-men', name:scope.infos['shop_title'] + ' ' + scope.infos['shop_men'], url:scope.menShopUrl },
				{ id:'shop-women', name:scope.infos['shop_title'] + ' ' + scope.infos['shop_women'], url:scope.womenShopUrl },
				{ id:'lab', name:scope.infos['camper_lab'], url:scope.labUrl },
			]
		}

		super.render('FrontContainer', parent, template, scope)
	}
	componentWillMount() {
		super.componentWillMount()
	}
	componentDidMount() {
		super.componentDidMount()

		if(AppStore.Detector.isMobile) {
			this.mobile = {
				menuIsOpened: false,
				el: this.child.find('.mobile-menu'),
				burger: this.child.find('.burger'),
				slidemenu: this.child.find('.menu-slider'),
				mainMenu: this.child.find('ul.main-menu'),
				socialMenu: this.child.find('ul.social-menu')
			}
		}

		this.$socialWrapper = this.child.find('#social-wrapper')
		this.$socialTitle = this.$socialWrapper.find('.social-title')
		this.$socialIconsContainer = this.$socialWrapper.find('ul')
		this.$socialBtns = this.$socialWrapper.find('li')
		this.$camperLab = this.child.find('.camper-lab')
		this.$shop = this.child.find('.shop-wrapper')
		this.$home = this.child.find('.home-btn')
		this.$mute = this.child.find('.mute')
		this.countriesH = 0

		if(AppStore.Detector.oldIE) {
			var $logo = this.child.find('.logo')
			var $facebook = this.child.find('#footer .facebook a')
			var $twitter = this.child.find('#footer .twitter a')
			var $instagram = this.child.find('#footer .instagram a')
			$logo.html('<img src=' + AppStore.baseMediaPath() + 'image/logo.png' +'>')
			$facebook.html('<img src=' + AppStore.baseMediaPath() + 'image/facebook.png' +'>')
			$twitter.html('<img src=' + AppStore.baseMediaPath() + 'image/twitter.png' +'>')
			$instagram.html('<img src=' + AppStore.baseMediaPath() + 'image/instagram.png' +'>')
		}

		this.onSubMenuMouseEnter = this.onSubMenuMouseEnter.bind(this)
		this.onSubMenuMouseLeave = this.onSubMenuMouseLeave.bind(this)
		this.$shop.on('mouseenter', this.onSubMenuMouseEnter)
		this.$shop.on('mouseleave', this.onSubMenuMouseLeave)

		this.onSocialMouseEnter = this.onSocialMouseEnter.bind(this)
		this.onSocialMouseLeave = this.onSocialMouseLeave.bind(this)
		this.$socialWrapper.on('mouseenter', this.onSocialMouseEnter)
		this.$socialWrapper.on('mouseleave', this.onSocialMouseLeave)

		this.onMuteClicked = this.onMuteClicked.bind(this)
		this.$mute.on('click', this.onMuteClicked)

		this.socialTl = new TimelineMax()
		this.socialTl.staggerFrom(this.$socialBtns, 1, { scale:0, y:10, force3D:true, opacity:0, transformOrigin:'50% 50%', ease:Elastic.easeOut }, 0.01, 0)
		this.socialTl.from(this.$socialIconsContainer, 1, { y:30, ease:Elastic.easeOut }, 0)
		this.socialTl.pause(0)

		this.resize()

		if(AppStore.Detector.isMobile) {
			this.initMobile()
		}
	}
	onMuteClicked(e) {
		e.preventDefault()
		AppActions.toggleSounds()
	}
	initMobile() {
		this.onBurgerClicked = this.onBurgerClicked.bind(this)
		this.mobile.burger.on('click', this.onBurgerClicked)

		this.mobile.tl = new TimelineMax()
		this.mobile.tl.from(this.mobile.slidemenu, 0.6, { scale:1.1, opacity:0, ease:Expo.easeInOut }, 0)
		this.mobile.tl.pause(0)
	}
	onBurgerClicked(e) {
		e.preventDefault()
		if(this.mobile.menuIsOpened) {
			clearTimeout(this.mobile.slideTimeout)
			this.mobile.slideTimeout = setTimeout(()=>{
				this.mobile.slidemenu.css('top', -3000)
			}, 900)
			this.mobile.tl.timeScale(1.4).reverse()
			this.mobile.menuIsOpened = false
		}else{
			this.mobile.slidemenu.css('top', 0)
			this.resizeMobile()
			this.mobile.tl.timeScale(1).play()
			this.mobile.menuIsOpened = true
		}
	}
	onSocialMouseEnter(e) {
		e.preventDefault()
		clearTimeout(this.socialBtnTimeout)
		this.socialTl.timeScale(1).play()
	}
	onSocialMouseLeave(e) {
		e.preventDefault()
		clearTimeout(this.socialBtnTimeout)
		this.socialBtnTimeout = setTimeout(()=>{
			this.socialTl.timeScale(1.8).reverse()
		}, 400)
	}
	onSubMenuMouseEnter(e) {
		e.preventDefault()
		var $target = $(e.currentTarget)
		$target.addClass('hovered')
	}
	onSubMenuMouseLeave(e) {
		e.preventDefault()
		var $target = $(e.currentTarget)
		$target.removeClass('hovered')
	}
	resize() {
		if(!this.domIsReady) return
		var windowW = AppStore.Window.w
		var windowH = AppStore.Window.h

		this.countriesH = 60
		this.countriesTitleH = 20

		var socialCss = {
			left: windowW - AppConstants.PADDING_AROUND - this.$socialTitle.width(),
			top: windowH - AppConstants.PADDING_AROUND - this.$socialTitle.height(),
		}
		var socialIconsCss = {
			left: (this.$socialTitle.width() >> 1) - (this.$socialIconsContainer.width() >> 1),
			top: -this.$socialIconsContainer.height() - 20
		}
		var camperLabCss = {
			left: windowW - AppConstants.PADDING_AROUND - this.$camperLab.width(),
			top: AppConstants.PADDING_AROUND,
		}
		var shopCss = {
			left: camperLabCss.left - this.$shop.width() - (AppConstants.PADDING_AROUND),
			top: AppConstants.PADDING_AROUND,
		}
		var homeCss = {
			left: shopCss.left - this.$home.width() - (AppConstants.PADDING_AROUND),
			top: AppConstants.PADDING_AROUND,
		}
		var muteCss = {
			left: AppConstants.PADDING_AROUND,
			top: windowH - AppConstants.PADDING_AROUND - this.$mute.height(),	
		}

		this.$socialWrapper.css(socialCss)
		this.$camperLab.css(camperLabCss)
		this.$shop.css(shopCss)
		this.$socialIconsContainer.css(socialIconsCss)
		this.$home.css(homeCss)
		this.$mute.css(muteCss)

		if(AppStore.Detector.isMobile) {
			this.resizeMobile()
		}
	}
	resizeMobile() {
		var windowW = AppStore.Window.w
		var windowH = AppStore.Window.h
		var burgerCss = {
			left: windowW - this.mobile.burger.width() - AppConstants.PADDING_AROUND,
			top: AppConstants.PADDING_AROUND
		}
		var slidemenuCss = {
			width: windowW,
			height: windowH
		}
		var mainMenuW = this.mobile.mainMenu.width()
		var mainMenuH = this.mobile.mainMenu.height()
		var mainMenuCss = {
			top: (windowH >> 1) - (mainMenuH >> 1) - (mainMenuH * 0.1),
			left: (windowW >> 1) - (mainMenuW >> 1)
		}
		var socialMenuCss = {
			top: mainMenuCss.top + mainMenuH + 10,
			left: (windowW >> 1) - (this.mobile.socialMenu.width() >> 1)
		}
		this.mobile.slidemenu.css(slidemenuCss)
		this.mobile.burger.css(burgerCss)
		this.mobile.mainMenu.css(mainMenuCss)
		this.mobile.socialMenu.css(socialMenuCss)
	}
	componentWillUnmount() {
		super.componentWillUnmount()
	}
}

export default FrontContainer


