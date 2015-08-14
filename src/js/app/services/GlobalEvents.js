import AppActions from 'AppActions'
import AppStore from 'AppStore'
    	
class GlobalEvents {
	init() {
		$(window).on('resize', this.resize)
		$(window).on('mousemove', this.onMouseMove)
		AppStore.Mouse = new PIXI.Point()
	}
	resize() {
		AppActions.windowResize(window.innerWidth, window.innerHeight)
	}
	onMouseMove(e) {
		e.preventDefault()
		AppStore.Mouse.x = e.pageX
		AppStore.Mouse.y = e.pageY
	}
}

export default GlobalEvents
