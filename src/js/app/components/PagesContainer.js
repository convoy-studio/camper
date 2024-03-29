import BaseComponent from 'BaseComponent'
import AppConstants from 'AppConstants'
import AppStore from 'AppStore'
import BasePager from 'BasePager'
import Router from 'Router'
import Landing from 'Landing'
import LandingTemplate from 'Landing_hbs'
import PlanetExperiencePage from 'PlanetExperiencePage'
import PlanetExperiencePageTemplate from 'PlanetExperiencePage_hbs'
import PlanetCampaignPage from 'PlanetCampaignPage'
import PlanetCampaignPageTemplate from 'PlanetCampaignPage_hbs'

class PagesContainer extends BasePager {
	constructor() {
		super()
		this.swallowHasherChange = false
	}
	componentWillMount() {
		AppStore.on(AppConstants.PAGE_HASHER_CHANGED, this.didHasherChange)
		AppStore.on(AppConstants.PAGE_HASHER_INTERNAL_CHANGE, this.didHasherInternalChange)
		super.componentWillMount()
	}
	componentDidMount() {
		super.componentDidMount()
	}
	componentWillUnmount() {
		AppStore.off(AppConstants.PAGE_HASHER_CHANGED, this.didHasherChange)
		AppStore.off(AppConstants.PAGE_HASHER_INTERNAL_CHANGE, this.didHasherInternalChange)
		super.componentWillUnmount()
	}
	didHasherInternalChange() {
		this.currentComponent.internalHasherChanged()
	}
	didHasherChange() {
		// Swallow hasher change if the change is fast as 1sec
		if(this.swallowHasherChange) return 
		else this.setupNewbornComponents()
		this.swallowHasherChange = true
		this.hasherChangeTimeout = setTimeout(()=>{
			this.swallowHasherChange = false
		}, 1000)
	}
	setupNewbornComponents() {
		var hash = Router.getNewHash()
		var template = { type: undefined, partial: undefined }
		switch(hash.parts.length) {
			case 1:
				template.type = Landing
				template.partial = LandingTemplate
				break
			case 2:
				template.type = PlanetExperiencePage
				template.partial = PlanetExperiencePageTemplate
				break
			case 3:
				template.type = PlanetCampaignPage
				template.partial = PlanetCampaignPageTemplate
				break
			default:
				template.type = Landing
				template.partial = LandingTemplate		
		}

		this.setupNewComponent(hash.parent, template)
		this.currentComponent = this.components['new-component']
	}
	update() {
		if(this.currentComponent != undefined) this.currentComponent.update()
	}
}

export default PagesContainer



