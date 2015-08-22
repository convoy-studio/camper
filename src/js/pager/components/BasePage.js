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
		// this.tlIn = AppStore.getTimeline()
		this.tlIn = new TimelineMax()
		this.tlIn.eventCallback('onComplete', this.didTransitionInComplete)
		TransitionAnimations[keyName](this, this.tlIn)
		this.tlIn.pause(0)
	}
	willTransitionIn() {
		this.tlIn.play(0)
	}
	willTransitionOut() {
		var keyName = this.props.type.toLowerCase() + '-out'
		// this.tlOut = AppStore.getTimeline()
		this.tlOut = new TimelineMax()
		this.tlOut.eventCallback('onComplete', this.didTransitionOutComplete)
		TransitionAnimations[keyName](this, this.tlOut)
		this.tlOut.play(0)
	}
	didTransitionInComplete() {
		// console.log('didTransitionInComplete', this.id, this.props.type)
		this.releaseTimelineIn()
		setTimeout(() => this.props.didTransitionInComplete(), 0)
	}
	didTransitionOutComplete() {
		// console.log('didTransitionOutComplete', this.id, this.props.type)
		this.releaseTimelineOut()
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
	releaseTimelineIn() {
		if(this.tlIn != undefined) {
			this.tlIn.clear()
			// AppStore.releaseTimeline(this.tlIn)
			this.tlIn = null
		}
	}
	releaseTimelineOut() {
		if(this.tlOut != undefined) {
			this.tlOut.clear()
			// AppStore.releaseTimeline(this.tlOut)
			this.tlIOut = null
		}
	}
	componentWillUnmount() {
		this.releaseTimelineIn()
		this.releaseTimelineOut()
	}
}
