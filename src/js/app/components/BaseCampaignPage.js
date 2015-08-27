import BasePlanetPage from 'BasePlanetPage'
import AppActions from 'AppActions'
import AppStore from 'AppStore'
import ScrollBar from 'ScrollBar'
import Utils from 'Utils'

export default class BaseCampaignPage extends BasePlanetPage {
	constructor(props) {
		super(props)
		this.pxScrollContainer = AppStore.getContainer()
		this.pxContainer.addChild(this.pxScrollContainer)
		this.pageHeight = 0
		this.scrollTarget = 0
	}
	componentDidMount() {
		this.scrollEl = this.child.find(".interface.absolute").get(0)

		this.onWheel = this.onWheel.bind(this)
		$(window).on("mousewheel", this.onWheel)
		this.scrollTarget = 0
		this.lastScrollY = 0
		this.scrollEase = 0.1

		this.onScrollTarget = this.onScrollTarget.bind(this)
		var scrollEl = this.child.find('#scrollbar-view')
		this.scrollbar = new ScrollBar(scrollEl)
		this.scrollbar.scrollTargetHandler = this.onScrollTarget
		this.scrollbar.componentDidMount()

		super.componentDidMount()
	}
	onScrollTarget(val) {
		this.scrollTargetChanged(val)
	}
	scrollTargetChanged(val) {
		this.scrollTarget = val
        this.applyScrollBounds()
        this.scrollbar.setScrollTarget(this.scrollTarget)
	}
	onWheel(e) {
		e.preventDefault()
		var delta = e.wheelDelta
		var value = -(e.deltaY * e.deltaFactor)
        this.updateScrollTarget(value)
	}
	updateScrollTarget(value) {
		this.scrollTarget += value
        this.applyScrollBounds()
        this.scrollbar.setScrollTarget(this.scrollTarget)
	}
	applyScrollBounds() {
		var windowH = AppStore.Window.h
		this.scrollTarget = (this.scrollTarget < 0) ? 0 : this.scrollTarget
        this.scrollTarget = (this.scrollTarget + windowH > this.pageHeight) ? (this.pageHeight - windowH) : this.scrollTarget
	}
	update() {
		this.lastScrollY += (this.scrollTarget - this.lastScrollY) * this.scrollEase
		Utils.Translate(this.scrollEl, 0, -this.lastScrollY, 0)
		this.pxScrollContainer.y = -this.lastScrollY
		this.scrollbar.update()
	}
	resize() {
		var windowH = AppStore.Window.h
		this.scrollbar.pageHeight = this.pageHeight - windowH
        this.scrollbar.resize()
		super.resize()
	}
	didTransitionOutComplete() {
		super.didTransitionOutComplete()
	}
	componentWillUnmount() {
		this.scrollbar.componentWillUnmount()
		this.pxScrollContainer.removeChildren()
		AppStore.releaseContainer(this.pxScrollContainer)
		$(window).off("mousewheel", this.onWheel)
		super.componentWillUnmount()
	}
}
