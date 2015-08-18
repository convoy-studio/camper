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
				currentLang = country
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
		this.$legal = this.child.find('.legal')
		this.$camperLab = this.child.find('.camper-lab')
		this.$shop = this.child.find('.shop-wrapper')
		this.$lang = this.child.find(".lang-wrapper")
		this.$langCurrentTitle = this.$lang.find(".current-lang")
		this.$countries = this.$lang.find(".countries-wrapper")
		this.countriesH = 0

		this.onLangMouseEnter = this.onLangMouseEnter.bind(this)
		this.onLangMouseLeave = this.onLangMouseLeave.bind(this)
		this.$lang.on('mouseenter', this.onLangMouseEnter)
		this.$lang.on('mouseleave', this.onLangMouseLeave)

		this.resize()
	}
	onLangMouseEnter(e) {
		e.preventDefault()
		this.$lang.addClass('hovered')
		console.log(this.countriesH)
	}
	onLangMouseLeave(e) {
		e.preventDefault()
		this.$lang.removeClass('hovered')
		console.log(this.countriesH)
	}
	resize() {
		if(!this.domIsReady) return
		var windowW = AppStore.Window.w
		var windowH = AppStore.Window.h

		this.countriesH = this.$countries.height()

		var socialCss = {
			left: windowW - AppConstants.PADDING_AROUND - this.$socialWrapper.width(),
			top: windowH - AppConstants.PADDING_AROUND - this.$socialWrapper.height(),
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
			left: camperLabCss.left - this.$shop.width() - (AppConstants.PADDING_AROUND << 1),
			top: AppConstants.PADDING_AROUND - 2,
		}
		var langCss = {
			left: shopCss.left - this.$langCurrentTitle.width() - (AppConstants.PADDING_AROUND << 1),
			top: AppConstants.PADDING_AROUND,
		}

		this.$socialWrapper.css(socialCss)
		this.$legal.css(legalCss)
		this.$camperLab.css(camperLabCss)
		this.$shop.css(shopCss)
		this.$lang.css(langCss)
	}
	componentWillUnmount() {
		super.componentWillUnmount()
	}
}

export default FrontContainer


