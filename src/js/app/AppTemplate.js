import BaseComponent from 'BaseComponent'
import FrontContainer from 'FrontContainer'
import PagesContainer from 'PagesContainer'

class AppTemplate extends BaseComponent {
	constructor() {
		super()
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

		GlobalEvents.resize()
	}
	componentWillUnmount() {
		super.componentWillUnmount()
	}
}

export default AppTemplate
