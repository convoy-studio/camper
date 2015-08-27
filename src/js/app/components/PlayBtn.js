import Knot from 'Knot'
import AppConstants from 'AppConstants'
import Utils from 'Utils'
import AppStore from 'AppStore'

export default class PlayBtn {
	constructor(element) {
		this.element = element
	}
	componentDidMount() {
		this.tlOver = AppStore.getTimeline()
		this.tlOut = AppStore.getTimeline()
		// var knotsEl = this.element.find(".knot")
		// var linesEl = this.element.find(".line")
		// var radius = 3
		// var margin = 30
		// this.lineSize = AppStore.getLineWidth()
		// for (var i = 0; i < knotsEl.length; i++) {
		// 	var knot = $(knotsEl[i])
		// 	knot.attr('r', radius)
		// };
		// for (var i = 0; i < linesEl.length; i++) {
		// 	var line = $(linesEl[i])
		// 	line.css('stroke-width', this.lineSize)
		// };

		// var startX = margin >> 1
		// var startY = margin
		// var offsetUpDown = 0.6
		// $(knotsEl.get(0)).attr({
		// 	'cx': startX + 0,
		// 	'cy': startY + 0
		// })
		// $(knotsEl.get(1)).attr({
		// 	'cx': startX + margin,
		// 	'cy': startY + 0
		// })
		// $(knotsEl.get(2)).attr({
		// 	'cx': startX + (margin*2),
		// 	'cy': startY + 0
		// })
		// $(knotsEl.get(3)).attr({
		// 	'cx': startX + (margin * offsetUpDown),
		// 	'cy': startY - (margin * offsetUpDown)
		// })
		// $(knotsEl.get(4)).attr({
		// 	'cx': startX + (margin * offsetUpDown),
		// 	'cy': startY + (margin * offsetUpDown)
		// })
		// $(linesEl.get(0)).attr({
		// 	'x1': startX + 0,
		// 	'y1': startY + 0,
		// 	'x2': startX + margin,
		// 	'y2': startY + 0
		// })
		// $(linesEl.get(1)).attr({
		// 	'x1': startX + margin,
		// 	'y1': startY + 0,
		// 	'x2': startX + (margin*2),
		// 	'y2': startY + 0
		// })
		// $(linesEl.get(2)).attr({
		// 	'x1': startX + 0,
		// 	'y1': startY + 0,
		// 	'x2': startX + (margin * offsetUpDown),
		// 	'y2': startY - (margin * offsetUpDown)
		// })
		// $(linesEl.get(3)).attr({
		// 	'x1': startX + 0,
		// 	'y1': startY + 0,
		// 	'x2': startX + (margin * offsetUpDown),
		// 	'y2': startY + (margin * offsetUpDown)
		// })

		// var offset = 10
		// this.tlOver.to(knotsEl[0], 1, { x:-offset+(radius >> 1), force3D:true, ease:Elastic.easeOut }, 0)
		// this.tlOver.to(knotsEl[1], 1, { x:-offset, force3D:true, ease:Elastic.easeOut }, 0)
		// this.tlOver.to(knotsEl[2], 1, { x:-offset, force3D:true, ease:Elastic.easeOut }, 0)
		// this.tlOver.to(linesEl[0], 1, { scaleX:1.1, x:-offset, force3D:true, transformOrigin:'50% 50%', ease:Elastic.easeOut }, 0)
		// this.tlOver.to(linesEl[1], 1, { scaleX:1.1, x:-offset, force3D:true, transformOrigin:'50% 50%', ease:Elastic.easeOut }, 0)
		// this.tlOver.to(linesEl[2], 1, { x:-offset, rotation:'10deg', force3D:true, transformOrigin:'0% 100%', ease:Elastic.easeOut }, 0)
		// this.tlOver.to(linesEl[3], 1, { x:-offset, rotation:'-10deg', force3D:true, transformOrigin:'0% 0%', ease:Elastic.easeOut }, 0)
		// this.tlOver.to(knotsEl[3], 1, { x:-offset/2, y:(offset/2)-radius, force3D:true, ease:Elastic.easeOut }, 0)
		// this.tlOver.to(knotsEl[4], 1, { x:-offset/2, y:-(offset/2)+radius, force3D:true, ease:Elastic.easeOut }, 0)

		// this.tlOut.to(knotsEl[0], 1, { x:0, force3D:true, ease:Elastic.easeOut }, 0)
		// this.tlOut.to(knotsEl[1], 1, { x:0, force3D:true, ease:Elastic.easeOut }, 0)
		// this.tlOut.to(knotsEl[2], 1, { x:0, force3D:true, ease:Elastic.easeOut }, 0)
		// this.tlOut.to(linesEl[0], 1, { scaleX:1, x:0, force3D:true, transformOrigin:'50% 50%', ease:Elastic.easeOut }, 0)
		// this.tlOut.to(linesEl[1], 1, { scaleX:1, x:0, force3D:true, transformOrigin:'50% 50%', ease:Elastic.easeOut }, 0)
		// this.tlOut.to(linesEl[2], 1, { x:0, rotation:'0deg', force3D:true, transformOrigin:'0% 100%', ease:Elastic.easeOut }, 0)
		// this.tlOut.to(linesEl[3], 1, { x:0, rotation:'0deg', force3D:true, transformOrigin:'0% 0%', ease:Elastic.easeOut }, 0)
		// this.tlOut.to(knotsEl[3], 1, { x:0, y:0, force3D:true, ease:Elastic.easeOut }, 0)
		// this.tlOut.to(knotsEl[4], 1, { x:0, y:0, force3D:true, ease:Elastic.easeOut }, 0)

		// this.tlOver.pause(0)
		// this.tlOut.pause(0)

		// this.rollover = this.rollover.bind(this)
		// this.rollout = this.rollout.bind(this)
		// this.click = this.click.bind(this)
		// this.element.on('mouseenter', this.rollover)
		// this.element.on('mouseleave', this.rollout)
		// if(this.btnClicked != undefined) this.element.on('click', this.click)

		// this.width = margin * 3
		// this.height = margin * 2
		// this.element.css({
		// 	width: this.width,
		// 	height: this.height
		// })
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
		this.mouseOut()	
	}
	rollover(e) {
		e.preventDefault()
		this.mouseOver()	
	}
	mouseOver() {
		this.tlOut.kill()
		this.tlOver.play(0)
	}
	mouseOut() {
		this.tlOver.kill()
		this.tlOut.play(0)
	}
	componentWillUnmount() {
		AppStore.releaseTimeline(this.tlOver)
		AppStore.releaseTimeline(this.tlOut)
		this.element.off('mouseenter', this.rollover)
		this.element.off('mouseleave', this.rollout)
		this.element.off('click', this.click)
	}
}
