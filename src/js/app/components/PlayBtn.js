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
		var knotsEl = this.element.find(".knot")
		var linesEl = this.element.find(".line")
		var aroundEl = this.element.find(".around")
		var radius = 3
		var margin = 30
		var circleRad = 60
		var circleContainerSize = 200
		this.lineSize = AppStore.getLineWidth()
		for (var i = 0; i < knotsEl.length; i++) {
			var knot = $(knotsEl[i])
			knot.attr('r', radius)
		};
		aroundEl.attr('r', circleRad)
		for (var i = 0; i < linesEl.length; i++) {
			var line = $(linesEl[i])
			line.css('stroke-width', this.lineSize)
		};

		var startX = circleContainerSize * 0.486
		var startY = circleContainerSize >> 1
		var offsetUpDown = 0.6
		$(knotsEl.get(0)).attr({
			'cx': startX + margin,
			'cy': startY + 0
		})
		$(knotsEl.get(1)).attr({
			'cx': startX - (margin * 0.4),
			'cy': startY - margin
		})
		$(knotsEl.get(2)).attr({
			'cx': startX - (margin * 0.4),
			'cy': startY + margin
		})
		$(aroundEl.get(0)).attr({
			'cx': circleContainerSize >> 1,
			'cy': circleContainerSize >> 1
		})
		$(linesEl.get(0)).attr({
			'x1': startX + margin,
			'y1': startY + 0,
			'x2': startX - (margin * 0.4),
			'y2': startY - margin
		})
		$(linesEl.get(1)).attr({
			'x1': startX + margin,
			'y1': startY + 0,
			'x2': startX - (margin * 0.4),
			'y2': startY + margin
		})

		var offset = 10
		var paddingX = 4
		if(AppStore.Detector.oldIE) {
			this.element.html('<img src=' + AppStore.baseMediaPath() + 'image/play-btn.png' +'>')
		}else{
			this.tlOver.to(aroundEl, 1, { scale:1.1, force3D:true, transformOrigin:'50% 50%', ease:Elastic.easeOut }, 0)
			this.tlOver.to(knotsEl[0], 1, { x:offset+(radius >> 1) - paddingX, force3D:true, ease:Elastic.easeOut }, 0)
			this.tlOver.to(knotsEl[1], 1, { x:-offset + 12 - paddingX, y:(offset >> 1) - 6, force3D:true, ease:Elastic.easeOut }, 0)
			this.tlOver.to(knotsEl[2], 1, { x:-offset + 12 - paddingX, y:-(offset >> 1) + 6, force3D:true, ease:Elastic.easeOut }, 0)
			this.tlOver.to(linesEl[0], 1, { scaleX:1.2, x:offset+(radius >> 1) - paddingX, force3D:true, transformOrigin:'100% 100%', ease:Elastic.easeOut }, 0)
			this.tlOver.to(linesEl[1], 1, { scaleX:1.2, x:offset+(radius >> 1) - paddingX, force3D:true, transformOrigin:'100% 0%', ease:Elastic.easeOut }, 0)

			this.tlOut.to(aroundEl, 1, { scale:1, force3D:true, transformOrigin:'50% 50%', ease:Elastic.easeOut }, 0)
			this.tlOut.to(knotsEl[0], 1, { x:0, force3D:true, ease:Elastic.easeOut }, 0)
			this.tlOut.to(knotsEl[1], 1, { x:0, y:0, force3D:true, ease:Elastic.easeOut }, 0)
			this.tlOut.to(knotsEl[2], 1, { x:0, y:0, force3D:true, ease:Elastic.easeOut }, 0)
			this.tlOut.to(linesEl[0], 1, { scaleX:1, x:0, force3D:true, transformOrigin:'100% 100%', ease:Elastic.easeOut }, 0)
			this.tlOut.to(linesEl[1], 1, { scaleX:1, x:0, force3D:true, transformOrigin:'100% 0%', ease:Elastic.easeOut }, 0)

			this.tlOver.pause(0)
			this.tlOut.pause(0)
		}

		this.close()

		return this
	}
	position(x, y) {
		this.element.css({
			left: x,
			top: y
		})
	}
	mouseOver() {
		if(AppStore.Detector.oldIE)  return
		this.tlOut.kill()
		this.tlOver.play(0)
	}
	mouseOut() {
		if(AppStore.Detector.oldIE)  return
		this.tlOver.kill()
		this.tlOut.play(0)
	}
	open() {
		TweenMax.fromTo(this.element, .1, { opacity:0 }, { opacity:1, ease:Expo.easeOut })
		setTimeout(()=>{
			this.element.css('visibility', 'visible')
		}, 80)
	}
	close() {
		TweenMax.fromTo(this.element, .1, { opacity:1 }, { opacity:0, ease:Expo.easeOut })
		setTimeout(()=>{
			this.element.css('visibility', 'hidden')
		}, 80)
	}
	componentWillUnmount() {
		AppStore.releaseTimeline(this.tlOver)
		AppStore.releaseTimeline(this.tlOut)
	}
}
