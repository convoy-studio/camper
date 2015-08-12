import BaseComponent from 'BaseComponent'
import FrontContainer from 'FrontContainer'
import PagesContainer from 'PagesContainer'
import PXContainer from 'PXContainer'
import AppStore from 'AppStore'
import AppConstants from 'AppConstants'
import AppActions from 'AppActions'

class AppTemplate extends BaseComponent {
	constructor() {
		super()
		AppStore.on(AppConstants.WINDOW_RESIZE, this.resize)
	}
	render(parent) {
		super.render('AppTemplate', parent, undefined)
	}
	componentWillMount() {
		super.componentWillMount()
	}
	componentDidMount() {
		super.componentDidMount()

		var frontContainer = new FrontContainer()
		frontContainer.render('#app-template')

		var pagesContainer = new PagesContainer()
		pagesContainer.render('#app-template')

		this.pxContainer = new PXContainer()
		this.pxContainer.init('#app-template')
		AppActions.pxContainerIsReady(this.pxContainer)

		GlobalEvents.resize()
	}
	componentWillUnmount() {
		super.componentWillUnmount()
	}
	resize() {
		this.pxContainer.resize()
	}
}

export default AppTemplate
