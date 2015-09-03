import AppStore from 'AppStore'

class Preloader  {
	constructor() {
		this.queue = new createjs.LoadQueue()
		this.queue.on("complete", this.onManifestLoadCompleted, this)
		this.currentLoadedCallback = undefined
	}
	load(manifest, onLoaded) {

		if(AppStore.Detector.oldIE) {
			onLoaded()
			return
		}

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
