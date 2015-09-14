class PagesLoader {
	constructor(el) {
		this.element = el
	}
	componentDidMount() {
		this.$spinnerWrapper = this.element.find('.spinner-wrapper')
		this.$background = this.element.find('.background')
		this.$spinnerSvg = this.$spinnerWrapper.find('svg')
		this.spinnerTween = TweenMax.to(this.$spinnerSvg, 0.5, { paused:true, rotation:'360deg', repeat:-1, ease:Linear.easeNone })

		this.tl = new TimelineMax()
		this.tl.from(this.$spinnerWrapper, 1, { scale:1.2, opacity:0, force3D:true, ease:Expo.easeInOut }, 0)
		this.tl.from(this.$background, 1, { opacity:0, force3D:true, ease:Expo.easeInOut }, 0)
		this.tl.pause(0)
	}
	open() {
		this.element.css('visibility', 'visible')
		this.spinnerTween.play()
		this.tl.play()
	}
	close() {
		this.tl.reverse()
		setTimeout(()=>{
			this.spinnerTween.pause()
			this.element.css('visibility', 'hidden')
		}, 600)	
	}
}

export default PagesLoader
