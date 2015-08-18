import Page from 'Page'
import AppActions from 'AppActions'

export default class BasePlanetPage extends Page {
	constructor(props) {
		super(props)
		this.experience = undefined
	}
	componentDidMount() {
		super.componentDidMount()
	}
	didTransitionOutComplete() {
		super.didTransitionOutComplete()
	}
	componentWillUnmount() {
		this.experience.componentWillUnmount()
		super.componentWillUnmount()
	}
}
