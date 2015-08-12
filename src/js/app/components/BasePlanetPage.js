import Page from 'Page'
import AppActions from 'AppActions'

export default class BasePlanetPage extends Page {
	constructor(props) {
		super(props)
		this.pxContainer = new PIXI.Container()
	}
	componentDidMount() {
		setTimeout(()=>{AppActions.pxAddChild(this.pxContainer)}, 0)
		super.componentDidMount()
	}
	didTransitionOutComplete() {
		setTimeout(()=>{AppActions.pxRemoveChild(this.pxContainer)}, 0)
		super.didTransitionOutComplete()
	}
}
