import BasePlanetPage from 'BasePlanetPage'
import AppActions from 'AppActions'
import AppStore from 'AppStore'
import CompassesContainer from 'CompassesContainer'
import RectangleBtn from 'RectangleBtn'
import Router from 'Router'
import AlaskaXP from 'AlaskaXP'
import SkiXP from 'SkiXP'
import MetalXP from 'MetalXP'
import WoodXP from 'WoodXP'
import GemStoneXP from 'GemStoneXP'

export default class PlanetExperiencePage extends BasePlanetPage {
	constructor(props) {
		super(props)
	}
	componentDidMount() {

		var infos = AppStore.generalInfosLangScope()

		var XpClazz = this.getExperienceById(this.id)
		this.experience = new XpClazz(this.pxContainer)
		this.experience.componentDidMount()
		
		// this.goCampaignBtn = new RectangleBtn(this.child.find('.go-campaign-btn'), infos.campaign_title)
		// this.goCampaignBtn.btnClicked = this.onGoCampaignClicked
		// this.goCampaignBtn.componentDidMount()

		super.componentDidMount()
	}
	onGoCampaignClicked() {
		var url = "/planet/" + this.id + '/0'
		Router.setHash(url)
	}
	getExperienceById(id) {
		switch(id){
			case 'ski': return SkiXP
			case 'metal': return MetalXP
			case 'alaska': return AlaskaXP
			case 'wood': return WoodXP
			case 'gemstone': return GemStoneXP
		}
	}
	didTransitionOutComplete() {
		super.didTransitionOutComplete()
	}
	didTransitionInComplete() {
		super.didTransitionInComplete()	
	}
	willTransitionOut() {
		super.willTransitionOut()
	}
	update() {
		this.experience.update()
	}
	resize() {
		var windowW = AppStore.Window.w
		var windowH = AppStore.Window.h

		this.experience.resize()

		super.resize()
	}
	componentWillUnmount() {
		// this.goCampaignBtn.componentWillUnmount()
		super.componentWillUnmount()
	}
}
