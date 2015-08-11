import BaseComponent from 'BaseComponent'
import AppConstants from 'AppConstants'
import AppStore from 'AppStore'
import BasePager from 'BasePager'
import Router from 'Router'
import Landing from 'Landing'
import LandingTemplate from 'Landing_hbs'

class PagesContainer extends BasePager {
	constructor() {
		super()
	}
	componentWillMount() {
		AppStore.on(AppConstants.PAGE_HASHER_CHANGED, this.didHasherChange)
		super.componentWillMount()
	}
	componentDidMount() {
		super.componentDidMount()
		this.didHasherChange()
	}
	componentWillUnmount() {
		AppStore.off(AppConstants.PAGE_HASHER_CHANGED, this.didHasherChange)
		super.componentWillUnmount()
	}
	didHasherChange() {
		var hash = Router.getNewHash()
		var type = undefined
		var template = undefined
		switch(hash.parent) {
			// case 'about':
			// 	type = About
			// 	template = AboutTemplate
			// 	break
			// case 'contact':
			// 	type = Contact
			// 	template = ContactTemplate
			// 	break
			case 'landing':
				type = Landing
				template = LandingTemplate
				break
			default:
				type = Landing
				template = LandingTemplate
		}
		this.setupNewComponent(hash.parent, type, template)
	}
}

export default PagesContainer



