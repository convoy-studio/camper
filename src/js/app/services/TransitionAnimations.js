import AppStore from 'AppStore'
import AppConstants from 'AppConstants'

function _getTimeline(args) {
	var tl = AppStore.getTimeline()
	tl.eventCallback("onComplete", args.onComplete)
	return tl
}

var TransitionAnimations = {

	// EXPERIENCE -------------------------------
	'experience-in': function(scope, args) {
		var wrapper = scope.child
		var types = AppStore.getTypeOfNewAndOldPage()
		var timeline = _getTimeline(args)

		var windowW = AppStore.Window.w
		var windowH = AppStore.Window.h

		timeline.from(wrapper, 1, { opacity:0, ease:Expo.easeInOut })

		switch(types.oldType){
			case AppConstants.LANDING:
				timeline.fromTo(scope.pxContainer, 1, { y:windowH, ease:Expo.easeInOut }, { y:0, ease:Expo.easeInOut }, 0)
				break
			case AppConstants.CAMPAIGN:
				timeline.fromTo(scope.pxContainer, 1, { y:-windowH, ease:Expo.easeInOut }, { y:0, ease:Expo.easeInOut }, 0)
				break
			case AppConstants.NONE:
				break
		}
		timeline.pause(0)
		return timeline
	},
	'experience-out': function(scope, args) {
		var wrapper = scope.child
		var types = AppStore.getTypeOfNewAndOldPage()
		var timeline = _getTimeline(args)

		var windowH = AppStore.Window.h

		timeline.to(wrapper, 1, { opacity:0, ease:Expo.easeInOut })
		
		switch(types.newType){
			case AppConstants.LANDING:
				timeline.fromTo(scope.pxContainer, 1, { y:0, ease:Expo.easeInOut }, { y:windowH, ease:Expo.easeInOut }, 0)
				break
			case AppConstants.CAMPAIGN:
				timeline.fromTo(scope.pxContainer, 1, { y:0, ease:Expo.easeInOut }, { y:-windowH, ease:Expo.easeInOut }, 0)
				break
			case AppConstants.NONE:
				break
		}
		timeline.pause(0)
		return timeline
	},

	// CAMPAIGN -------------------------------
	'campaign-in': function(scope, args) {
		var wrapper = scope.child
		var types = AppStore.getTypeOfNewAndOldPage()
		var timeline = _getTimeline(args)

		var windowH = AppStore.Window.h

		timeline.from(wrapper, 1, { opacity:0, ease:Expo.easeInOut })

		switch(types.oldType){
			case AppConstants.LANDING:
				timeline.fromTo(scope.pxContainer, 1, { y:windowH, ease:Expo.easeInOut }, { y:0, ease:Expo.easeInOut }, 0)
				break
			case AppConstants.EXPERIENCE:
				timeline.fromTo(scope.pxContainer, 1, { y:windowH, ease:Expo.easeInOut }, { y:0, ease:Expo.easeInOut }, 0)
				break
			case AppConstants.NONE:
				break
		}
		timeline.pause(0)
		return timeline
	},
	'campaign-out': function(scope, args) {
		var wrapper = scope.child
		var types = AppStore.getTypeOfNewAndOldPage()
		var timeline = _getTimeline(args)

		var windowH = AppStore.Window.h

		timeline.to(wrapper, 1, { opacity:0, ease:Expo.easeInOut })
		
		switch(types.newType){
			case AppConstants.LANDING:
				timeline.fromTo(scope.pxContainer, 1, { y:0, ease:Expo.easeInOut }, { y:windowH, ease:Expo.easeInOut }, 0)
				break
			case AppConstants.EXPERIENCE:
				timeline.fromTo(scope.pxContainer, 1, { y:0, ease:Expo.easeInOut }, { y:windowH, ease:Expo.easeInOut }, 0)
				break
			case AppConstants.NONE:
				break
		}
		timeline.pause(0)
		return timeline
	},

	// LANDING -------------------------------
	'landing-in': function(scope, args) {
		var wrapper = scope.child
		var types = AppStore.getTypeOfNewAndOldPage()
		var timeline = _getTimeline(args)

		var windowH = AppStore.Window.h
		timeline.from(wrapper, 1, { opacity:0, ease:Expo.easeInOut })

		switch(types.oldType){
			case AppConstants.LANDING:
				break
			case AppConstants.EXPERIENCE:
				timeline.fromTo(scope.pxContainer, 1, { y:-windowH, ease:Expo.easeInOut }, { y:0, ease:Expo.easeInOut }, 0)
				break
			case AppConstants.CAMPAIGN:
				timeline.fromTo(scope.pxContainer, 1, { y:-windowH, ease:Expo.easeInOut }, { y:0, ease:Expo.easeInOut }, 0)
				break
			case AppConstants.NONE:
				break
		}
		timeline.pause(0)
		return timeline
	},
	'landing-out': function(scope, args) {
		var wrapper = scope.child
		var types = AppStore.getTypeOfNewAndOldPage()
		var timeline = _getTimeline(args)

		var windowW = AppStore.Window.w
		var windowH = AppStore.Window.h

		timeline.to(wrapper, 1, { opacity:0, ease:Expo.easeInOut })
		
		switch(types.newType){
			case AppConstants.EXPERIENCE:
				timeline.to(scope.pxContainer, 1, { y:-windowH, ease:Expo.easeInOut }, 0)
				break
			case AppConstants.CAMPAIGN:
				timeline.to(scope.pxContainer, 1, { y:-windowH, ease:Expo.easeInOut }, 0)
				break
			case AppConstants.NONE:
				break
		}
		timeline.pause(0)
		return timeline
	}
}

export default TransitionAnimations
