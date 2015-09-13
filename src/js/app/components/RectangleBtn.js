import Knot from 'Knot'
import AppConstants from 'AppConstants'
import Utils from 'Utils'
import AppStore from 'AppStore'

export default class RectangleBtn {
	constructor(element, titleTxt, rectW) {
		this.element = element
		this.titleTxt = titleTxt
		this.rectW = rectW
	}
	componentDidMount() {
		this.tlOver = AppStore.getTimeline()
		this.tlOut = AppStore.getTimeline()
		this.width = 0
		this.height = 0
		var knotsEl = this.element.find(".knot")
		var linesEl = this.element.find(".line")
		var titleEl = this.element.find(".btn-title")
		var radius = 3
		var paddingX = 24
		var paddingY = 20
		this.lineSize = AppStore.getLineWidth()
		if(this.titleTxt != undefined) titleEl.text(this.titleTxt)

		setTimeout(()=>{

			var titleW = this.rectW == undefined ? titleEl.width() : this.rectW
			var titleH = AppConstants.GLOBAL_FONT_SIZE

			for (var i = 0; i < knotsEl.length; i++) {
				var knot = $(knotsEl[i])
				knot.attr('r', radius)
			};
			for (var i = 0; i < linesEl.length; i++) {
				var line = $(linesEl[i])
				line.css('stroke-width', this.lineSize)
			};

			this.width = titleW + (paddingX << 1)
			this.height = titleH + (paddingY << 1)
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
			$(linesEl.get(0)).attr({
				'x1': startX + 0,
				'y1': startY + 0,
				'x2': this.width - startX,
				'y2': startY + 0
			})
			$(linesEl.get(1)).attr({
				'x1': this.width - startX,
				'y1': startY + 0,
				'x2': this.width - startX,
				'y2': this.height - startY
			})
			$(linesEl.get(2)).attr({
				'x1': this.width - startX,
				'y1': this.height - startY,
				'x2': startY + 0,
				'y2': this.height - startY
			})
			$(linesEl.get(3)).attr({
				'x1': startX + 0,
				'y1': startY + 0,
				'x2': startX + 0,
				'y2': this.height - startY
			})

			this.tlOver.to(knotsEl[0], 1, { x:-3, y:-3, force3D:true, ease:Elastic.easeOut }, 0)
			this.tlOver.to(knotsEl[1], 1, { x:3, y:-3, force3D:true, ease:Elastic.easeOut }, 0)
			this.tlOver.to(knotsEl[2], 1, { x:-3, y:3, force3D:true, ease:Elastic.easeOut }, 0)
			this.tlOver.to(knotsEl[3], 1, { x:3, y:3, force3D:true, ease:Elastic.easeOut }, 0)
			this.tlOver.to(linesEl[0], 1, { scaleX:1.05, y:-3, force3D:true, transformOrigin:'50% 50%', ease:Elastic.easeOut }, 0)
			this.tlOver.to(linesEl[1], 1, { scaleY:1.05, x:3, force3D:true, transformOrigin:'50% 50%', ease:Elastic.easeOut }, 0)
			this.tlOver.to(linesEl[2], 1, { scaleX:1.05, y:3, force3D:true, transformOrigin:'50% 50%', ease:Elastic.easeOut }, 0)
			this.tlOver.to(linesEl[3], 1, { scaleY:1.05, x:-3, force3D:true, transformOrigin:'50% 50%', ease:Elastic.easeOut }, 0)

			this.tlOut.to(knotsEl[0], 1, { x:0, y:0, force3D:true, ease:Elastic.easeOut }, 0)
			this.tlOut.to(knotsEl[1], 1, { x:0, y:0, force3D:true, ease:Elastic.easeOut }, 0)
			this.tlOut.to(knotsEl[2], 1, { x:0, y:0, force3D:true, ease:Elastic.easeOut }, 0)
			this.tlOut.to(knotsEl[3], 1, { x:0, y:0, force3D:true, ease:Elastic.easeOut }, 0)
			this.tlOut.to(linesEl[0], 1, { scaleX:1, y:0, force3D:true, transformOrigin:'50% 50%', ease:Elastic.easeOut }, 0)
			this.tlOut.to(linesEl[1], 1, { scaleY:1, x:0, force3D:true, transformOrigin:'50% 50%', ease:Elastic.easeOut }, 0)
			this.tlOut.to(linesEl[2], 1, { scaleX:1, y:0, force3D:true, transformOrigin:'50% 50%', ease:Elastic.easeOut }, 0)
			this.tlOut.to(linesEl[3], 1, { scaleY:1, x:0, force3D:true, transformOrigin:'50% 50%', ease:Elastic.easeOut }, 0)

			this.tlOver.pause(0)
			this.tlOut.pause(0)

			// this.rollover = this.rollover.bind(this)
			// this.rollout = this.rollout.bind(this)
			// this.element.on('mouseenter', this.rollover)
			// this.element.on('mouseleave', this.rollout)

			if(this.btnClicked != undefined) {
				this.click = this.click.bind(this)
				this.element.on('click', this.click)
			}
		}, 0)
	}
	position(x, y) {
		Utils.Translate(this.element.get(0), x, y, 0)
		this.x = x
		this.y = y
	}
	click(e) {
		e.preventDefault()
		this.btnClicked()
	}
	rollout() {
		this.tlOver.kill()
		this.tlOut.play(0)
	}
	rollover() {
		this.tlOut.kill()
		this.tlOver.play(0)
	}
	componentWillUnmount() {
		AppStore.releaseTimeline(this.tlOver)
		AppStore.releaseTimeline(this.tlOut)
		if(this.btnClicked != undefined) {
			this.element.off('click', this.click)
		}
	}
}
