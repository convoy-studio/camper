import BasePage from 'BasePage'
import AppStore from 'AppStore'
import AppConstants from 'AppConstants'
import AppActions from 'AppActions'

export default class Page extends BasePage {
	constructor(props) {
		super(props)
		this.resize = this.resize.bind(this)
		this.pxContainer = new PIXI.Container()
	}
	componentDidMount() {
		setTimeout(()=>{AppActions.pxAddChild(this.pxContainer)}, 0)
		super.componentDidMount()
	}
	componentWillMount() {
		AppStore.on(AppConstants.WINDOW_RESIZE, this.resize)
		super.componentWillMount()
	}
	didTransitionOutComplete() {
		setTimeout(()=>{AppActions.pxRemoveChild(this.pxContainer)}, 0)
		super.didTransitionOutComplete()
	}
	setupAnimations() {
		super.setupAnimations()
	}
	resize() {
		super.resize()
	}
	componentWillUnmount() {
		AppStore.off(AppConstants.WINDOW_RESIZE, this.resize)
		super.componentWillUnmount()
	}
}
