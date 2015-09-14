
class Sounds  {
	constructor() {
		this.isMute = true
		this.activeIds = []
		this.tweenVal = {val:1}
	}
	play(id, params) {
		var parameters = params || {}
		parameters.volume = this.isMute ? 0 : 1
		var sound = createjs.Sound.play(id, parameters)
		this.addedAsActive(id, sound)
	}
	addedAsActive(id, sound) {
		var alreadyAdded = false
		for (var i = 0; i < this.activeIds.length; i++) {
			var activeS = this.activeIds[i]
			if(activeS.id == id) {
				alreadyAdded = true
			}
		}
		if(!alreadyAdded) {
			this.activeIds.push({
				id: id,
				sound: sound
			})
		}
	}
	toggle() {
		if(this.isMute) {
			this.unMuteAll()
			this.isMute = false
		}else{
			this.muteAll()
			this.isMute = true
		}
	}
	muteAll() {
		TweenMax.fromTo(this.tweenVal, 0.5, { val:1 }, { val:0, ease:Linear.easeInOut, onUpdate: ()=>{
			this.updateAllSoundsParams('volume', this.tweenVal.val)
		}})
	}
	unMuteAll() {
		TweenMax.fromTo(this.tweenVal, 0.5, { val:0 }, { val:1, ease:Linear.easeInOut, onUpdate: ()=>{
			this.updateAllSoundsParams('volume', this.tweenVal.val)
		}})
	}
	updateAllSoundsParams(param, value) {
		for (var i = 0; i < this.activeIds.length; i++) {
			var activeS = this.activeIds[i]
			activeS.sound[param] = value
		};
	}
	stopSoundsByPlanetId(id) {
		var tempArray = []
		for (var i = 0; i < this.activeIds.length; i++) {
			var activeS = this.activeIds[i]
			if(activeS.id.indexOf(id) >= 0) {
				activeS.sound.stop()
			}else{
				tempArray.push(activeS)
			}
		}
		this.activeIds = tempArray.slice(0)
	}
}

export default Sounds
