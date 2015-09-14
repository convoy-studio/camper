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
import AppConstants from 'AppConstants'
import ArrowBtn from 'ArrowBtn'

export default class PlanetExperiencePage extends BasePlanetPage {
	constructor(props) {
		super(props)
	}
	componentDidMount() {
		this.transitionInCompleted = false

		var infos = AppStore.generalInfosLangScope()
		
		var XpClazz = this.getExperienceById(this.id)
		this.experience = new XpClazz(this.pxContainer, this.child, this.parent)
		this.experience.id = this.id
		this.experience.componentDidMount()

		this.$campaignBtn = this.child.find('.dots-rectangle-btn')
		this.goCampaignBtn = new RectangleBtn(this.$campaignBtn, infos.campaign_title)
		this.goCampaignBtn.btnClicked = this.onGoCampaignClicked
		this.goCampaignBtn.componentDidMount()

		this.onCampaignMouseEnter = this.onCampaignMouseEnter.bind(this)
		this.onCampaignMouseLeave = this.onCampaignMouseLeave.bind(this)
		this.$campaignBtn.on('mouseenter', this.onCampaignMouseEnter)
		this.$campaignBtn.on('mouseleave', this.onCampaignMouseLeave)

		this.arrowClicked = this.arrowClicked.bind(this)
		this.previousBtn = new ArrowBtn(this.child.find('.previous-btn'), AppConstants.LEFT)
		this.previousBtn.btnClicked = this.arrowClicked
		this.previousBtn.componentDidMount()
		this.nextBtn = new ArrowBtn(this.child.find('.next-btn'), AppConstants.RIGHT)
		this.nextBtn.btnClicked = this.arrowClicked
		this.nextBtn.componentDidMount()

		super.componentDidMount()
	}
	arrowClicked(direction) {
		var planet;
		switch(direction) {
			case AppConstants.RIGHT:
				planet = AppStore.getNextPlanet(this.id)
				break
			case AppConstants.LEFT:
				planet = AppStore.getPreviousPlanet(this.id)
				break
		}
		var url = "/planet/" + planet
		Router.setHash(url)
	}
	onCampaignMouseEnter(e) {
		e.preventDefault()
		this.goCampaignBtn.rollover()
	}
	onCampaignMouseLeave(e) {
		e.preventDefault()
		this.goCampaignBtn.rollout()
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
		this.transitionInCompleted = true
		super.didTransitionInComplete()	
	}
	willTransitionOut() {
		this.experience.willTransitionOut()
		super.willTransitionOut()
	}
	update() {
		if(this.transitionInCompleted) {
			this.experience.update()
		}
	}
	resize() {
		var windowW = AppStore.Window.w
		var windowH = AppStore.Window.h

		this.experience.resize()

		this.previousBtn.position(
			AppConstants.PADDING_AROUND,
			(windowH >> 1) - (this.previousBtn.height >> 1)
		)
		this.nextBtn.position(
			windowW - this.nextBtn.width - AppConstants.PADDING_AROUND,
			(windowH >> 1) - (this.previousBtn.height >> 1)
		)

		setTimeout(()=>{
			this.goCampaignBtn.position(
				(windowW >> 1) - (this.goCampaignBtn.width >> 1),
				(windowH) - (this.goCampaignBtn.height * 0.7) - AppConstants.PADDING_AROUND
			)
		}, 0)

		super.resize()
	}
	componentWillUnmount() {
		this.goCampaignBtn.componentWillUnmount()
		this.$campaignBtn.off('mouseenter', this.onCampaignMouseEnter)
		this.$campaignBtn.off('mouseleave', this.onCampaignMouseLeave)
		this.previousBtn.componentWillUnmount()
		this.nextBtn.componentWillUnmount()
		super.componentWillUnmount()
	}
}
