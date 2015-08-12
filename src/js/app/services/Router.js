import data from 'GlobalData'
import hasher from 'hasher'
import AppActions from 'AppActions'
import crossroads from 'crossroads'
import AppStore from 'AppStore'

class Router {
	init() {
		this.routing = data.routing
		this.defaultRoute = this.routing['/']
		this.newHashFounded = false
		hasher.newHash = undefined
		hasher.oldHash = undefined
		hasher.prependHash = '!'
		hasher.initialized.add(this._didHasherChange.bind(this))
		hasher.changed.add(this._didHasherChange.bind(this))
		this._setupCrossroads()
	}
	beginRouting() {
		hasher.init()
	}
	_setupCrossroads() {
		var planets = AppStore.planets()
		var basicSection = crossroads.addRoute('{page}', this._onFirstDegreeURLHandler.bind(this), 3)
		basicSection.rules = {
	        page : ['landing'] //valid sections
	    }
	    var planetProductSection = crossroads.addRoute('/planet/{planetId}/{productId}', this._onPlanetProductURLHandler.bind(this), 2)
	    planetProductSection.rules = {
	    	planetId: planets,
	    	productId : /^[0-2]/
	    }
	    var planetSection = crossroads.addRoute('/planet/{planetId}', this._onPlanetURLHandler.bind(this), 2)
	    planetSection.rules = {
	    	planetId: planets
	    }
	}
	_onFirstDegreeURLHandler(pageId) {
		this._assignRoute(pageId)
	}
	_onPlanetProductURLHandler(planetId, productId) {
		this._assignRoute(productId)
	}
	_onPlanetURLHandler(planetId) {
		this._assignRoute(planetId)
	}
	_onBlogPostURLHandler(postId) {
		this._assignRoute(postId)
	}
	_onDefaultURLHandler() {
		this._sendToDefault()
	}
	_assignRoute(id) {
		var hash = hasher.getHash()
		var parts = this._getURLParts(hash)
		this._updatePageRoute(hash, parts, parts[0], id)
		this.newHashFounded = true
	}
	_getURLParts(url) {
		var hash = url
		hash = hash.substr(1)
		return hash.split('/')
	}
	_updatePageRoute(hash, parts, parent, targetId) {
		hasher.oldHash = hasher.newHash
		hasher.newHash = {
			hash: hash,
			parts: parts,
			parent: parent,
			targetId: targetId
		}
		AppActions.pageHasherChanged()
	}
	_didHasherChange(newHash, oldHash) {
		this.newHashFounded = false
		crossroads.parse(newHash)
		if(this.newHashFounded) return
		// If URL don't match a pattern, send to default
		this._onDefaultURLHandler()
	}
	_sendToDefault() {
		hasher.setHash(AppStore.defaultRoute())
	}
	static getBaseURL() {
		return document.URL.split("#")[0]
	}
	static getHash() {
		return hasher.getHash()
	}
	static getRoutes() {
		return data.routing
	}
	static getNewHash() {
		return hasher.newHash
	}
	static getOldHash() {
		return hasher.oldHash
	}
	static setHash(hash) {
		hasher.setHash(hash)
	}
}

export default Router
