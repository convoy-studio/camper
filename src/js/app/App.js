import AppStore from 'AppStore'
import AppActions from 'AppActions'
import AppTemplate from 'AppTemplate'
import Router from 'Router'
import GEvents from 'GlobalEvents'
import Pool from 'Pool'
import Preloader from 'Preloader'
import MobileDetect from 'mobile-detect'

class App {
	constructor() {
	}
	init() {

		var md = new MobileDetect(window.navigator.userAgent)

		AppStore.Detector.isMobile = (md.mobile() || md.tablet()) ? true : false

		// Init Preloader
		AppStore.Preloader = new Preloader()

		// Init Pool
		AppStore.Pool = new Pool()

		// Init router
		this.router = new Router()
		this.router.init()

		// Init global events
		window.GlobalEvents = new GEvents()
		GlobalEvents.init()

		var appTemplate = new AppTemplate()
		this.templateIsReady = this.templateIsReady.bind(this)
		appTemplate.isReady = this.templateIsReady
		appTemplate.render('#app-container')
	}
	templateIsReady() {
		// Start routing
		this.router.beginRouting()
	}
}

export default App
    	
