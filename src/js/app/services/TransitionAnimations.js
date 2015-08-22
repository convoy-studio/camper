import AppStore from 'AppStore'
import AppConstants from 'AppConstants'

var TransitionAnimations = {

	// EXPERIENCE -------------------------------
	'experience-in': function(scope, timeline) {
		var wrapper = scope.child
		var types = AppStore.getTypeOfNewAndOldPage()
		var windowW = AppStore.Window.w
		var windowH = AppStore.Window.h

		switch(types.oldType){
			case AppConstants.LANDING:
				timeline.fromTo(scope.pxContainer, 1, { y:windowH, ease:Expo.easeInOut }, { y:0, ease:Expo.easeInOut }, 0)
				timeline.fromTo(wrapper, 1, { y:windowH, ease:Expo.easeInOut }, { y:0, ease:Expo.easeInOut }, 0)
				break
			case AppConstants.EXPERIENCE:
				timeline.fromTo(scope.pxContainer, 1, { x:windowW, ease:Expo.easeInOut }, { x:0, ease:Expo.easeInOut }, 0)
				timeline.fromTo(wrapper, 1, { x:windowW, ease:Expo.easeInOut }, { x:0, ease:Expo.easeInOut }, 0)
				break
			case AppConstants.CAMPAIGN:
				timeline.fromTo(scope.pxContainer, 1, { y:-windowH, ease:Expo.easeInOut }, { y:0, ease:Expo.easeInOut }, 0)
				timeline.fromTo(wrapper, 1, { y:-windowH, ease:Expo.easeInOut }, { y:0, ease:Expo.easeInOut }, 0)
				break
			case AppConstants.NONE:
				break
		}
		timeline.pause(0)
	},
	'experience-out': function(scope, timeline) {
		var wrapper = scope.child
		var types = AppStore.getTypeOfNewAndOldPage()
		var windowW = AppStore.Window.w
		var windowH = AppStore.Window.h

		timeline.to(wrapper, 1, { opacity:0, ease:Expo.easeInOut })
		
		switch(types.newType){
			case AppConstants.LANDING:
				timeline.fromTo(scope.pxContainer, 1, { y:0, ease:Expo.easeInOut }, { y:windowH, ease:Expo.easeInOut }, 0)
				timeline.fromTo(wrapper, 1, { y:0, ease:Expo.easeInOut }, { y:windowH, ease:Expo.easeInOut }, 0)
				break
			case AppConstants.EXPERIENCE:
				timeline.fromTo(scope.pxContainer, 1, { x:0, ease:Expo.easeInOut }, { x:-windowH, ease:Expo.easeInOut }, 0)
				timeline.fromTo(wrapper, 1, { x:0, ease:Expo.easeInOut }, { x:-windowH, ease:Expo.easeInOut }, 0)
				break
			case AppConstants.CAMPAIGN:
				timeline.fromTo(scope.pxContainer, 1, { y:0, ease:Expo.easeInOut }, { y:-windowH, ease:Expo.easeInOut }, 0)
				timeline.fromTo(wrapper, 1, { y:0, ease:Expo.easeInOut }, { y:-windowH, ease:Expo.easeInOut }, 0)
				break
			case AppConstants.NONE:
				break
		}
		timeline.pause(0)
	},

	// CAMPAIGN -------------------------------
	'campaign-in': function(scope, timeline) {
		var wrapper = scope.child
		var types = AppStore.getTypeOfNewAndOldPage()
		var windowH = AppStore.Window.h

		switch(types.oldType){
			case AppConstants.LANDING:
				timeline.fromTo(scope.pxContainer, 1, { y:windowH, ease:Expo.easeInOut }, { y:0, ease:Expo.easeInOut }, 0)
				timeline.fromTo(wrapper, 1, { y:windowH, ease:Expo.easeInOut }, { y:0, ease:Expo.easeInOut }, 0)
				break
			case AppConstants.EXPERIENCE:
				timeline.fromTo(scope.pxContainer, 1, { y:windowH, ease:Expo.easeInOut }, { y:0, ease:Expo.easeInOut }, 0)
				timeline.fromTo(wrapper, 1, { y:windowH, ease:Expo.easeInOut }, { y:0, ease:Expo.easeInOut }, 0)
				break
			case AppConstants.NONE:
				break
		}
		timeline.pause(0)
	},
	'campaign-out': function(scope, timeline) {
		var wrapper = scope.child
		var types = AppStore.getTypeOfNewAndOldPage()
		var windowH = AppStore.Window.h

		switch(types.newType){
			case AppConstants.LANDING:
				timeline.fromTo(scope.pxContainer, 1, { y:0, ease:Expo.easeInOut }, { y:windowH, ease:Expo.easeInOut }, 0)
				timeline.fromTo(wrapper, 1, { y:0, ease:Expo.easeInOut }, { y:windowH, ease:Expo.easeInOut }, 0)
				break
			case AppConstants.EXPERIENCE:
				timeline.fromTo(scope.pxContainer, 1, { y:0, ease:Expo.easeInOut }, { y:windowH, ease:Expo.easeInOut }, 0)
				timeline.fromTo(wrapper, 1, { y:0, ease:Expo.easeInOut }, { y:windowH, ease:Expo.easeInOut }, 0)
				break
			case AppConstants.NONE:
				break
		}
		timeline.pause(0)
	},

	// LANDING -------------------------------
	'landing-in': function(scope, timeline) {
		var wrapper = scope.child
		var types = AppStore.getTypeOfNewAndOldPage()
		var windowH = AppStore.Window.h

		switch(types.oldType){
			case AppConstants.LANDING:
				break
			case AppConstants.EXPERIENCE:
				timeline.fromTo(scope.pxContainer, 1, { y:-windowH, ease:Expo.easeInOut }, { y:0, ease:Expo.easeInOut }, 0)
				timeline.fromTo(wrapper, 1, { y:-windowH, ease:Expo.easeInOut }, { y:0, ease:Expo.easeInOut }, 0)
				break
			case AppConstants.CAMPAIGN:
				timeline.fromTo(scope.pxContainer, 1, { y:-windowH, ease:Expo.easeInOut }, { y:0, ease:Expo.easeInOut }, 0)
				timeline.fromTo(wrapper, 1, { y:-windowH, ease:Expo.easeInOut }, { y:0, ease:Expo.easeInOut }, 0)
				break
			case AppConstants.NONE:
				break
		}
		timeline.pause(0)
	},
	'landing-out': function(scope, timeline) {
		var wrapper = scope.child
		var types = AppStore.getTypeOfNewAndOldPage()
		var windowW = AppStore.Window.w
		var windowH = AppStore.Window.h

		switch(types.newType){
			case AppConstants.EXPERIENCE:
				timeline.to(scope.pxContainer, 1, { y:-windowH, ease:Expo.easeInOut }, 0)
				timeline.to(wrapper, 1, { y:-windowH, ease:Expo.easeInOut }, 0)
				break
			case AppConstants.CAMPAIGN:
				timeline.to(scope.pxContainer, 1, { y:-windowH, ease:Expo.easeInOut }, 0)
				timeline.to(wrapper, 1, { y:-windowH, ease:Expo.easeInOut }, 0)
				break
			case AppConstants.NONE:
				break
		}
		timeline.pause(0)
	}
}

export default TransitionAnimations
