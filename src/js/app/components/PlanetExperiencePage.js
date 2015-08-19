import BasePlanetPage from 'BasePlanetPage'
import AppActions from 'AppActions'
import AppStore from 'AppStore'
import CompassesContainer from 'CompassesContainer'
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
		var bunnyUrl = this.getImageUrlById('bunny')
		var texture = PIXI.Texture.fromImage(bunnyUrl)
		var bunny = new PIXI.Sprite(texture)

		this.g = new PIXI.Graphics()
		this.pxContainer.addChild(this.g)
		this.pxContainer.addChild(bunny)

		this.compassesContainer = new CompassesContainer(this.pxContainer)
		this.compassesContainer.componentDidMount()

		var XpClazz = this.getExperienceById(this.id)
		this.experience = new XpClazz()
		this.experience.componentDidMount()

		super.componentDidMount()
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
	update() {
		this.experience.update()
		this.compassesContainer.update()
	}
	resize() {
		var windowW = AppStore.Window.w
		var windowH = AppStore.Window.h

		this.experience.resize()
		this.compassesContainer.resize()

		// draw a rectangle
		this.g.clear()
		this.g.beginFill(Math.random() * 0xffffff)
		this.g.drawRect(0, 0, windowW, windowH)
		this.g.endFill()

		super.resize()
	}
	componentWillUnmount() {
		this.compassesContainer.componentWillUnmount()
		super.componentWillUnmount()
	}
}
