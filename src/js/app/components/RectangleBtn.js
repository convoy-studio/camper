import Knot from 'Knot'
import AppConstants from 'AppConstants'
import Utils from 'Utils'
import AppStore from 'AppStore'

export default class RectangleBtn {
	constructor(element, titleTxt) {
		this.element = element
		this.titleTxt = titleTxt
	}
	componentDidMount() {
		this.tlOver = AppStore.getTimeline()
		this.tlOut = AppStore.getTimeline()
		var knotsEl = this.element.find(".knot")
		var linesEl = this.element.find(".line")
		var titleEl = this.element.find(".btn-title")
		var radius = 3
		var padding = 20
		this.lineSize = AppStore.getLineWidth()
		titleEl.text(this.titleTxt)
		setTimeout(()=>{
			var titleW = titleEl.width()
			var titleH = titleEl.height()

			for (var i = 0; i < knotsEl.length; i++) {
				var knot = $(knotsEl[i])
				knot.attr('r', radius)
			};
			for (var i = 0; i < linesEl.length; i++) {
				var line = $(linesEl[i])
				line.css('stroke-width', this.lineSize)
			};


			this.width = titleW + (padding << 1)
			this.height = titleH + (padding << 1)
			titleEl.css({
				left: (this.width >> 1) - (titleW >> 1),
				top: (this.height >> 1) - (titleH >> 1)
			})
			this.element.css({
				width: this.width,
				height: this.height
			})

			var startX = radius * 3
			var startY = radius * 3
			var offsetUpDown = 0.6
			$(knotsEl.get(0)).attr({
				'cx': startX + 0,
				'cy': startY + 0
			})
			$(knotsEl.get(1)).attr({
				'cx': this.width - startX,
				'cy': startY + 0
			})
			$(knotsEl.get(2)).attr({
				'cx': startX + 0,
				'cy': this.height - startY
			})
			$(knotsEl.get(3)).attr({
				'cx': this.width - startX,
				'cy': this.height - startY
			})
		}, 0)
	}
	position(x, y) {
		this.element.css({
			left: x,
			top: y
		})
	}
	click(e) {
		e.preventDefault()
		this.btnClicked(this.direction)
	}
	rollout(e) {
		e.preventDefault()
		this.tlOver.kill()
		this.tlOut.play(0)
	}
	rollover(e) {
		e.preventDefault()
		this.tlOut.kill()
		this.tlOver.play(0)
	}
	componentWillUnmount() {
		AppStore.releaseTimeline(this.tlOver)
		AppStore.releaseTimeline(this.tlOut)
		// this.element.off('mouseenter', this.rollover)
		// this.element.off('mouseleave', this.rollout)
		// this.element.off('click', this.click)
	}
}
