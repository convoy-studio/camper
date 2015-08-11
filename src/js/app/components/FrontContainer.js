import BaseComponent from 'BaseComponent'
import template from 'FrontContainer_hbs'
import AppStore from 'AppStore'

class FrontContainer extends BaseComponent {
	constructor() {
		super()
	}
	render(parent) {
		var scope = AppStore.globalContent()
		scope.menu = AppStore.menuContent()
		super.render('FrontContainer', parent, template, scope)
	}
	componentWillMount() {
		super.componentWillMount()
	}
	componentDidMount() {
		super.componentDidMount()
	}
	componentWillUnmount() {
		super.componentWillUnmount()
	}
}

export default FrontContainer


