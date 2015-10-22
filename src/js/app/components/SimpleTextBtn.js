    	
class SimpleTextBtn {
	constructor(el) {
		this.element = el
	}
	componentDidMount() {
		var txt = this.element.text()
		this.textWrap = this.element.find('.text-wrap')
		this.txtW = this.textWrap.width()
		this.txtH = 16
		this.line = $('<div class="text-line"></div>')
		this.element.append(this.line)
		this.element.css('overflow', 'hidden')

		this.line.css({
			'width': this.txtW,
			'top': (this.txtH >> 1) - (2)
		})

		this.tlOver = new TimelineMax()

		this.tlOver.addLabel('begin', 0)
		this.tlOver.fromTo(this.line, 1, {scaleX:0, transformOrigin:'50% 50%'}, { scaleX:1, ease:Expo.easeOut, transformOrigin:'50% 50%' }, 0)
		this.tlOver.addLabel('mouseover', 1)
		this.tlOver.fromTo(this.line, 1, {scaleX:1, transformOrigin:'50% 50%'}, { scaleX:0, ease:Expo.easeOut, transformOrigin:'50% 50%' }, 1)
		this.tlOver.addLabel('mouseout', 2)
		this.tlOver.play('begin', false)

		this.rollover = this.rollover.bind(this)
		this.rollout = this.rollout.bind(this)
		this.element.on('mouseenter', this.rollover)
		this.element.on('mouseleave', this.rollout)

	}
	rollover(e) {
		e.preventDefault()
		this.tlOver.tweenFromTo('begin', 'mouseover').timeScale(1.8)
	}
	rollout(e) {
		e.preventDefault()
		this.tlOver.tweenFromTo('mouseover', 'mouseout').timeScale(2)
	}
}

export default SimpleTextBtn
