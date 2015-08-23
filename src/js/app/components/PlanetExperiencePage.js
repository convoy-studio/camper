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

		this.compassesContainer = new CompassesContainer(this.pxContainer, this.child)
		this.compassesContainer.id = this.id
		this.compassesContainer.componentDidMount()

		var XpClazz = this.getExperienceById(this.id)
		this.experience = new XpClazz()
		this.experience.componentDidMount()

		this.goCampaignBtn = new RectangleBtn(this.child.find('.go-campaign-btn'), infos.campaign_title)
		this.goCampaignBtn.btnClicked = this.onGoCampaignClicked
		this.goCampaignBtn.componentDidMount()

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
		this.compassesContainer.didTransitionInComplete()
	}
	willTransitionOut() {
		super.willTransitionOut()
		this.compassesContainer.willTransitionOut()
	}
	update() {
		this.experience.update()
		this.compassesContainer.update()
	}
	resize() {
		var windowW = AppStore.Window.w
		var windowH = AppStore.Window.h

		this.experience.resize()
		this.compassesContainer.resize()

		setTimeout(()=>{
			var compassContainerBottom = this.compassesContainer.y + this.compassesContainer.height
			this.goCampaignBtn.position(
				(windowW >> 1) - (this.goCampaignBtn.width >> 1),
				compassContainerBottom + (this.goCampaignBtn.height >> 1)
			)
		}, 0)

		super.resize()
	}
	componentWillUnmount() {
		this.compassesContainer.componentWillUnmount()
		this.goCampaignBtn.componentWillUnmount()
		super.componentWillUnmount()
	}
}
