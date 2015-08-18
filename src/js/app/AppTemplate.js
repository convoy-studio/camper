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
		this.isReady = undefined
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

		this.frontContainer = new FrontContainer()
		this.frontContainer.render('#app-template')

		this.pagesContainer = new PagesContainer()
		this.pagesContainer.render('#app-template')

		this.pxContainer = new PXContainer()
		this.pxContainer.init('#app-template')
		AppActions.pxContainerIsReady(this.pxContainer)

		GlobalEvents.resize()

		this.animate()

		setTimeout(()=>{this.isReady()}, 0)
	}
	componentWillUnmount() {
		super.componentWillUnmount()
	}
	animate() {
		requestAnimationFrame(this.animate)
	    this.pxContainer.update()
	    this.pagesContainer.update()
	}
	resize() {
		this.frontContainer.resize()
		this.pxContainer.resize()
	}
}

export default AppTemplate
