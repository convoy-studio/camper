import AppStore from 'AppStore'
import AppActions from 'AppActions'
import AppTemplate from 'AppTemplate'
import Router from 'Router'
import GEvents from 'GlobalEvents'

class App {
	constructor() {
	}
	init() {
		// Init router
		var router = new Router()
		router.init()

		// Init global events
		window.GlobalEvents = new GEvents()
		GlobalEvents.init()

		var appTemplate = new AppTemplate()
		appTemplate.render('#app-container')

		// Start routing
		router.beginRouting()
	}
}

export default App
    	
