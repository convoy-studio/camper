import AppStore from 'AppStore'
import AppActions from 'AppActions'
import AppTemplate from 'AppTemplate'
import Router from 'Router'
import GEvents from 'GlobalEvents'
import Pool from 'Pool'
import Preloader from 'Preloader'
import Sounds from 'Sounds'
import MobileDetect from 'mobile-detect'
import AppConstants from 'AppConstants'
import hasher from 'hasher'
import PagesLoader from 'PagesLoader'
import Utils from 'Utils'

class App {
	constructor() {
		this.onMainAssetsLoaded = this.onMainAssetsLoaded.bind(this)
	}
	init() {
			var md = new MobileDetect(window.navigator.userAgent)

			AppStore.Detector.isMobile = (md.mobile() || md.tablet()) ? true : false

			var $appContainer = $('#app-container')
			AppStore.Detector.oldIE = $appContainer.is('.ie6, .ie7, .ie8')
			// AppStore.Detector.oldIE = true

			AppStore.Detector.isSupportWebGL = Utils.SupportWebGL()

			if(AppStore.Detector.oldIE) {
				AppStore.Detector.isMobile = true
			}

			// Init Preloader
			AppStore.Preloader = new Preloader()

			// Init Sounds
			AppStore.Sounds = new Sounds()

			// Init Pool
			AppStore.Pool = new Pool()

			AppStore.PagesLoader = new PagesLoader($('#assets-loader-page'))
			AppStore.PagesLoader.componentDidMount()

			// Init router
			this.router = new Router()
			this.router.init()

			this.$mainLoader = $('#main-loader')
			this.$mainLoader.css('opacity', 1)
			var $spinner = this.$mainLoader.find('.spinner-wrapper')
			var $spinnerSvg = $spinner.find('svg')
			var $logo = this.$mainLoader.find('.logo')
			var $background = this.$mainLoader.find('.background')
			this.tlIn = AppStore.getTimeline()
			this.tlOut = AppStore.getTimeline()

			this.tlIn.fromTo($spinner, 1, {opacity:0}, { opacity:1, force3D:true, ease:Expo.easeOut }, 0)
			this.tlIn.fromTo($logo, 1, {opacity:0}, { opacity:1, force3D:true, ease:Expo.easeOut }, 0)
			this.tlIn.play(0)

			this.spinnerTween = TweenMax.to($spinnerSvg, 0.5, { rotation:'360deg', repeat:-1, ease:Linear.easeNone })

			this.tlOut.to($spinner, 1, { scale:1.2, y:10, opacity:0, force3D:true, ease:Expo.easeInOut }, 0)
			this.tlOut.to($logo, 1, { scale:1.2, y:-10, opacity:0, force3D:true, ease:Expo.easeInOut }, 0)
			this.tlOut.to($background, 1, { opacity:0, force3D:true, ease:Expo.easeInOut }, 0.6)
			this.tlOut.pause(0)

			// Init global events
			window.GlobalEvents = new GEvents()
			GlobalEvents.init()

			var appTemplate = new AppTemplate()
			appTemplate.isReady = ()=>{}
			appTemplate.render('#app-container')
			this.loadMainAssets()
	}
	loadMainAssets() {
		var hashUrl = location.hash.substring(2)
		var parts = hashUrl.substr(1).split('/')

		var manifest = []
		if(parts.length < 3) {
			var h = {
				hash: hashUrl,
				parts: parts
			}
			hasher.newHash = h
			var manifest = AppStore.pageAssetsToLoad()	
		}

		if(manifest.length < 1 && parts.length < 3) {

			var manifest = []
			var planets = AppStore.planets()
			for (var i = 0; i < planets.length; i++) {
				var planet = planets[i]
				var o = {}
				var imgUrl = AppStore.mainImageUrl(planet, AppConstants.RESPONSIVE_IMAGE)
				manifest[i] = {
					id: 'main-loader-assets-' + planet,
	            	src: imgUrl
				}
			}

		}
		if(manifest.length < 1) {
			this.onMainAssetsLoaded()
		}else{
			AppStore.Preloader.load(manifest, this.onMainAssetsLoaded)
		}
	}
	onMainAssetsLoaded() {
		setTimeout(()=>{
			this.tlOut.play()
			// Start routing
			this.router.beginRouting()
			setTimeout(()=>{
				this.spinnerTween.pause()
				this.spinnerTween = null
				this.$mainLoader.remove()
				AppStore.releaseTimeline(this.tlIn)
				AppStore.releaseTimeline(this.tlOut)
			}, 1600)
		}, 500)
	}
}

export default App
    	
