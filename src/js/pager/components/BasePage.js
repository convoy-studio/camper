import BaseComponent from 'BaseComponent'
import TransitionAnimations from 'TransitionAnimations'
import AppStore from 'AppStore'

export default class BasePage extends BaseComponent {
	constructor(props) {
		super()
		this.props = props
		this.didTransitionInComplete = this.didTransitionInComplete.bind(this)
		this.didTransitionOutComplete = this.didTransitionOutComplete.bind(this)
	}
	componentDidMount() {
		this.child.addClass(this.props.type.toLowerCase())
		this.resize()
		this.setupAnimations()
		setTimeout(() => this.props.isReady(this.props.hash), 0)
	}
	setupAnimations() {
		var keyName = this.props.type.toLowerCase() + '-in'
		this.tlIn = TransitionAnimations[keyName](this, {onComplete:this.didTransitionInComplete})
	}
	willTransitionIn() {
		this.tlIn.play(0)
	}
	willTransitionOut() {
		var keyName = this.props.type.toLowerCase() + '-out'
		this.tlOut = TransitionAnimations[keyName](this, {onComplete:this.didTransitionOutComplete})
		this.tlOut.play(0)
	}
	didTransitionInComplete() {
		setTimeout(() => this.props.didTransitionInComplete(), 0)
	}
	didTransitionOutComplete() {
		setTimeout(() => this.props.didTransitionOutComplete(), 0)
	}
	resize() {
	}
	forceUnmount() {
		if(this.tlIn != undefined) {
			this.tlIn.pause(0)
		}
		if(this.tlOut != undefined) {
			this.tlOut.pause(0)
		}
		this.didTransitionOutComplete()
	}
	componentWillUnmount() {
		if(this.tlIn != undefined) {
			this.tlIn.clear()
			AppStore.releaseTimeline(this.tlIn)
		}
		if(this.tlOut != undefined) {
			this.tlOut.clear()
			AppStore.releaseTimeline(this.tlOut)
		}
	}
}
