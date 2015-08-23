import Knot from 'Knot'
import AppConstants from 'AppConstants'
import Utils from 'Utils'
import AppStore from 'AppStore'

export default class TitleSwitcher {
	constructor(element) {
		this.element = element
	}
	componentDidMount() {
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
			this.width = currentTitleW
		}, 0)
	}
	position(x, y) {
		// this.element.css({
		// 	left: x,
		// 	top: y
		// })
		TweenMax.set(this.element, { x: x, y: y })
		this.x = x
		this.y = y
	}
	componentWillUnmount() {
	}
}
