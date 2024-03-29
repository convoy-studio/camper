import BasePage from 'BasePage'
import AppStore from 'AppStore'
import AppConstants from 'AppConstants'
import AppActions from 'AppActions'
import Router from 'Router'

export default class Page extends BasePage {
	constructor(props) {
		super(props)
		this.resize = this.resize.bind(this)
		this.pxContainer = AppStore.getContainer()
	}
	componentDidMount() {

		if(AppStore.Detector.isMobile) {
			this.child.css('position', 'absolute')
			$('html').css('overflow-y', 'auto')
		}

		if(this.props.type == AppConstants.LANDING) this.parent.css('cursor', 'pointer')
		else this.parent.css('cursor', 'auto')

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
	getImageUrlById(id) {
		return AppStore.Preloader.getImageURL(this.id + '-' + this.props.type.toLowerCase() + '-' + id)
	}
	resize() {
		super.resize()
	}
	update() {
	}
	componentWillUnmount() {
		if(!AppStore.Detector.oldIE) this.pxContainer.removeChildren()
		AppStore.releaseContainer(this.pxContainer)
		AppStore.off(AppConstants.WINDOW_RESIZE, this.resize)
		super.componentWillUnmount()
	}
}
