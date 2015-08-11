import AppActions from 'AppActions'
    	
class GlobalEvents {
	init() {
		$(window).on('resize', this.resize)
	}
	resize() {
		AppActions.windowResize(window.innerWidth, window.innerHeight)
	}
}

export default GlobalEvents
