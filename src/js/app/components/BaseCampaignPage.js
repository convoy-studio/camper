import BasePlanetPage from 'BasePlanetPage'
import AppActions from 'AppActions'
import inertia from 'wheel-inertia'
import AppStore from 'AppStore'

export default class BaseCampaignPage extends BasePlanetPage {
	constructor(props) {
		super(props)
		this.pxScrollContainer = AppStore.getContainer()
		this.pxContainer.addChild(this.pxScrollContainer)
		this.pageHeight = 0
	}
	componentDidMount() {
		this.scrollEl = this.child.find(".interface.absolute")

		this.onWheel = this.onWheel.bind(this)
		$(window).on("mousewheel", this.onWheel)
		inertia.addCallback(this.onInertia)
		this.scrollTarget = 0
		this.lastScrollY = 0
		this.scrollEase = 0.1

		super.componentDidMount()
	}
	onInertia(direction) {
		// this.onDownClicked()
	}
	onWheel(e) {
		e.preventDefault()
		var delta = e.wheelDelta
		inertia.update(delta)
		var value = -(e.deltaY * e.deltaFactor)
        this.updateScrollTarget(value)
	}
	updateScrollTarget(value) {
		var windowH = AppStore.Window.h
		this.scrollTarget += value
        this.scrollTarget = (this.scrollTarget < 0) ? 0 : this.scrollTarget
        this.scrollTarget = (this.scrollTarget + windowH > this.pageHeight) ? (this.pageHeight - windowH) : this.scrollTarget
	}
	update() {
		// console.log(this.scrollTarget)
		this.lastScrollY += (this.scrollTarget - this.lastScrollY) * this.scrollEase
		TweenMax.set(this.scrollEl, { y:-this.lastScrollY, force3D:true })
		TweenMax.set(this.pxScrollContainer, { y:-this.lastScrollY, force3D:true })
	}
	resize() {
		super.resize()
	}
	didTransitionOutComplete() {
		super.didTransitionOutComplete()
	}
	componentWillUnmount() {
		this.pxScrollContainer.removeChildren()
		AppStore.releaseContainer(this.pxScrollContainer)
		$(window).off("mousewheel", this.onWheel)
		inertia.addCallback(null)
		super.componentWillUnmount()
	}
}
