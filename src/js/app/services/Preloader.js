import AppStore from 'AppStore'

class Preloader  {
	constructor() {
		this.queue = new createjs.LoadQueue()
		if(!AppStore.Detector.oldIE) {
			createjs.Sound.alternateExtensions = ["mp3"]
			this.queue.installPlugin(createjs.Sound)
		}
		this.queue.on("complete", this.onManifestLoadCompleted, this)
		this.currentLoadedCallback = undefined
		this.allManifests = []
	}
	load(manifest, onLoaded) {

		if(AppStore.Detector.oldIE) {
			onLoaded()
			return
		}

		if(this.allManifests.length > 0) {
			for (var i = 0; i < this.allManifests.length; i++) {
				var m = this.allManifests[i]
				if(m.length == manifest.length && m[0].id == manifest[0].id && m[m.length-1].id == manifest[manifest.length-1].id) {
					onLoaded()	
					return
				}
			};
		}

		this.allManifests.push(manifest)
		this.currentLoadedCallback = onLoaded
        this.queue.loadManifest(manifest)
	}
	onManifestLoadCompleted() {
		this.currentLoadedCallback()
	}
	getContentById(id) {
		return this.queue.getResult(id)
	}
	getSvg(id) {
		return this.getContentById(id+"-svg")
	}
	getImageURL(id) {
		return this.getContentById(id).getAttribute("src")
	}
}

export default Preloader
