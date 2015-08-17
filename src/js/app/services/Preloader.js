class Preloader  {
	constructor() {
		this.queue = new createjs.LoadQueue()
		this.queue.on("complete", this.onManifestLoadCompleted, this)
		this.currentLoadedCallback = undefined
	}
	load(manifest, onLoaded) {
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
		return this.queue.getResult(id).getAttribute("src")
	}
}

export default Preloader
