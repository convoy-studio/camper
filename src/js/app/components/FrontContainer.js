import BaseComponent from 'BaseComponent'
import template from 'FrontContainer_hbs'
import AppStore from 'AppStore'
import AppConstants from 'AppConstants'

class FrontContainer extends BaseComponent {
	constructor() {
		super()
	}
	render(parent) {
		var generaInfos = AppStore.generalInfos()
		var scope = AppStore.globalContent()
		scope.facebookUrl = generaInfos['facebook_url']
		scope.twitterUrl = generaInfos['twitter_url']
		scope.instagramUrl = generaInfos['instagram_url']
		scope.menu = AppStore.menuContent()
		super.render('FrontContainer', parent, template, scope)
	}
	componentWillMount() {
		super.componentWillMount()
	}
	componentDidMount() {
		super.componentDidMount()
		this.$socialWrapper = this.child.find('#social-wrapper')
		this.resize()
	}
	resize() {
		if(!this.domIsReady) return
		var windowW = AppStore.Window.w
		var windowH = AppStore.Window.h
		this.$socialWrapper.css({
			left: windowW - AppConstants.PADDING_AROUND - this.$socialWrapper.width(),
			top: windowH - AppConstants.PADDING_AROUND - this.$socialWrapper.height(),
		})
	}
	componentWillUnmount() {
		super.componentWillUnmount()
	}
}

export default FrontContainer


