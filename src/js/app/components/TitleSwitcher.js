import Knot from 'Knot'
import AppConstants from 'AppConstants'
import Utils from 'Utils'
import AppStore from 'AppStore'
import RectangleBtn from 'RectangleBtn'

export default class TitleSwitcher {
	constructor(element, rectangleEl, buyTxt) {
		this.element = element
		this.rectEl = rectangleEl
		this.buyTxt = buyTxt
	}
	componentDidMount() {
		this.productTitleWrapper = this.element.find(".product-title-wrapper")
		var containerA = this.element.find('.title-a')
		var containerB = this.element.find('.title-b')
		this.containers = {
			'title-a': {
				el: containerA
			},
			'title-b': {
				el: containerB
			}
		}
		this.width = 100
		this.height = AppConstants.GLOBAL_FONT_SIZE

		var rectWidth = this.buyTxt.length * 10
		this.rectangleBorder = new RectangleBtn(this.rectEl, null, 110 + rectWidth)
		this.rectangleBorder.componentDidMount()
		this.allRectSvgKnots = this.rectEl.find('svg .knot')
		this.allRectSvgLines = this.rectEl.find('svg .line')

		if(this.onClick != undefined) {
			this.onClicked = this.onClicked.bind(this)
			this.element.on('click', this.onClicked)
		}
		this.onOver = this.onOver.bind(this)
		this.onOut = this.onOut.bind(this)
		this.element.on('mouseenter', this.onOver)
		this.element.on('mouseleave', this.onOut)
	}
	onOver(e) {
		e.preventDefault()
		this.rectangleBorder.rollover()
	}
	onOut(e) {
		e.preventDefault()
		this.rectangleBorder.rollout()
	}
	onClicked(e) {
		e.preventDefault()
		this.onClick()
	}
	updateColor(color) {
		var c = color
		c = c.replace("0x", "#")
		this.allRectSvgKnots.css('fill', c)
		this.allRectSvgLines.css('stroke', c)
	}
	update(name) {
		this.currentTitleClass = (this.currentTitleClass === 'title-a') ? 'title-b' : 'title-a'
		this.previousTitle = this.currentTitle
		this.currentTitle = this.containers[this.currentTitleClass]
		this.currentTitle.el.text(name)

		this.updateComponentSize()

		this.currentTitle.el.removeClass('did-transition-in').removeClass('did-transition-out').removeClass('will-transition-out').addClass('will-transition-in')
		if(this.previousTitle != undefined) {
			this.previousTitle.el.removeClass('did-transition-out').removeClass('did-transition-in').removeClass('will-transition-in').addClass('will-transition-out')
		}
	}
	show() {
		this.element.css('width', this.currentTitle.width)
		this.currentTitle.el.removeClass('did-transition-out').removeClass('will-transition-in').removeClass('will-transition-out').addClass('did-transition-in')
		if(this.previousTitle != undefined){
			this.previousTitle.el.removeClass('did-transition-in').removeClass('will-transition-in').removeClass('will-transition-out').addClass('did-transition-out')
		}
	}
	updateComponentSize() {
		setTimeout(()=>{
			var currentTitleW = this.currentTitle.el.width()
			this.currentTitle.width = currentTitleW
			this.width = this.rectangleBorder.width
		}, 0)
	}
	position(x, y) {
		Utils.Translate(this.productTitleWrapper.get(0), (this.width >> 1) - (this.currentTitle.width >> 1), 0, 0)
		Utils.Translate(this.element.get(0), x, y, 0)
		this.x = x
		this.y = y
	}
	componentWillUnmount() {
		if(this.onClick != undefined) {
			this.element.off('click', this.onClicked)
		}
		this.element.off('mouseenter', this.onOver)
		this.element.off('mouseleave', this.onOut)
	}
}
