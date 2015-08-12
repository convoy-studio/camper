import BaseComponent from 'BaseComponent'
import AppConstants from 'AppConstants'
import AppStore from 'AppStore'
import BasePager from 'BasePager'
import Router from 'Router'
import Landing from 'Landing'
import LandingTemplate from 'Landing_hbs'
import Alaska from 'Alaska'
import AlaskaTemplate from 'Alaska_hbs'
import Ski from 'Ski'
import SkiTemplate from 'Ski_hbs'

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
		var template = { type: undefined, partial: undefined }
		switch(hash.parts.length) {
			case 1:
				template.type = Landing
				template.partial = LandingTemplate
				break
			case 2:
				switch(hash.targetId) {
					case 'ski':
						template.type = Ski
						template.partial = SkiTemplate
						break
					case 'metal':
						break
					case 'alaska':
						template.type = Alaska
						template.partial = AlaskaTemplate
						break
					case 'wood':
						break
					case 'gemstone':
						break
				}
				break
			case 3:
				break
			default:
				template.type = Landing
				template.partial = LandingTemplate		
		}

		this.setupNewComponent(hash.parent, template)
	}
}

export default PagesContainer



