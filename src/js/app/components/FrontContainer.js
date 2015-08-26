import BaseComponent from 'BaseComponent'
import template from 'FrontContainer_hbs'
import AppStore from 'AppStore'
import AppConstants from 'AppConstants'

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

		var countries = AppStore.countries()
		var lang = AppStore.lang()
		var currentLang;
		var restCountries = []
		var fullnameCountries = scope.infos.countries
		for (var i = 0; i < countries.length; i++) {
			var country = countries[i]
			if(country.lang == lang) {
				currentLang = fullnameCountries[country.id]
			}else{
				country.name = fullnameCountries[country.id]
				restCountries.push(country)
			}
		}
		scope.countries = restCountries
		scope.current_lang = currentLang

		super.render('FrontContainer', parent, template, scope)
	}
	componentWillMount() {
		super.componentWillMount()
	}
	componentDidMount() {
		super.componentDidMount()
		this.$socialWrapper = this.child.find('#social-wrapper')
		this.$socialTitle = this.$socialWrapper.find('.social-title')
		this.$socialIconsContainer = this.$socialWrapper.find('ul')
		this.$socialBtns = this.$socialWrapper.find('li')
		this.$legal = this.child.find('.legal')
		this.$camperLab = this.child.find('.camper-lab')
		this.$shop = this.child.find('.shop-wrapper')
		this.$lang = this.child.find(".lang-wrapper")
		this.$langCurrentTitle = this.$lang.find(".current-lang")
		this.$countries = this.$lang.find(".submenu-wrapper")
		this.$home = this.child.find('.home-btn')
		this.countriesH = 0

		this.onSubMenuMouseEnter = this.onSubMenuMouseEnter.bind(this)
		this.onSubMenuMouseLeave = this.onSubMenuMouseLeave.bind(this)
		this.$lang.on('mouseenter', this.onSubMenuMouseEnter)
		this.$lang.on('mouseleave', this.onSubMenuMouseLeave)
		this.$shop.on('mouseenter', this.onSubMenuMouseEnter)
		this.$shop.on('mouseleave', this.onSubMenuMouseLeave)

		this.onSocialMouseEnter = this.onSocialMouseEnter.bind(this)
		this.onSocialMouseLeave = this.onSocialMouseLeave.bind(this)
		this.$socialWrapper.on('mouseenter', this.onSocialMouseEnter)
		this.$socialWrapper.on('mouseleave', this.onSocialMouseLeave)

		this.socialTl = new TimelineMax()
		this.socialTl.staggerFrom(this.$socialBtns, 1, { scale:0, y:10, force3D:true, opacity:0, transformOrigin:'50% 50%', ease:Elastic.easeOut }, 0.01, 0)
		this.socialTl.from(this.$socialIconsContainer, 1, { y:30, ease:Elastic.easeOut }, 0)
		this.socialTl.pause(0)

		this.resize()
		this.$lang.css('height', this.countriesTitleH)
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
		$target.css('height', this.countriesH + this.countriesTitleH)
	}
	onSubMenuMouseLeave(e) {
		e.preventDefault()
		var $target = $(e.currentTarget)
		$target.removeClass('hovered')
		$target.css('height', this.countriesTitleH)
	}
	resize() {
		if(!this.domIsReady) return
		var windowW = AppStore.Window.w
		var windowH = AppStore.Window.h

		this.countriesH = this.$countries.height() + 20
		this.countriesTitleH = this.$langCurrentTitle.height()

		var socialCss = {
			left: windowW - AppConstants.PADDING_AROUND - this.$socialTitle.width(),
			top: windowH - AppConstants.PADDING_AROUND - this.$socialTitle.height(),
		}
		var socialIconsCss = {
			left: (this.$socialTitle.width() >> 1) - (this.$socialIconsContainer.width() >> 1),
			top: -this.$socialIconsContainer.height() - 20
		}
		var legalCss = {
			left: AppConstants.PADDING_AROUND,
			top: windowH - AppConstants.PADDING_AROUND - this.$legal.height(),	
		}
		var camperLabCss = {
			left: windowW - AppConstants.PADDING_AROUND - this.$camperLab.width(),
			top: AppConstants.PADDING_AROUND,
		}
		var shopCss = {
			left: camperLabCss.left - this.$shop.width() - (AppConstants.PADDING_AROUND),
			top: AppConstants.PADDING_AROUND,
		}
		var langCss = {
			left: shopCss.left - this.$langCurrentTitle.width() - (AppConstants.PADDING_AROUND),
			top: AppConstants.PADDING_AROUND,
		}
		var homeCss = {
			left: langCss.left - this.$home.width() - (AppConstants.PADDING_AROUND),
			top: AppConstants.PADDING_AROUND,
		}

		this.$socialWrapper.css(socialCss)
		this.$legal.css(legalCss)
		this.$camperLab.css(camperLabCss)
		this.$shop.css(shopCss)
		this.$lang.css(langCss)
		this.$socialIconsContainer.css(socialIconsCss)
		this.$home.css(homeCss)
	}
	componentWillUnmount() {
		super.componentWillUnmount()
	}
}

export default FrontContainer


