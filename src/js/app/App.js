import AppStore from 'AppStore'
import AppActions from 'AppActions'
import AppTemplate from 'AppTemplate'
import Router from 'Router'
import GEvents from 'GlobalEvents'
import Pool from 'Pool'

class App {
	constructor() {
	}
	init() {

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
    	
