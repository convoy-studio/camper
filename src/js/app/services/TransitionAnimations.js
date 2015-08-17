import AppStore from 'AppStore'
import AppConstants from 'AppConstants'

var TransitionAnimations = {

	// EXPERIENCE -------------------------------
	'experience-in': function(scope, args) {
		var wrapper = scope.child
		var types = AppStore.getTypeOfNewAndOldPage()
		var timeline = new TimelineMax(args)

		timeline.from(wrapper, 1, { opacity:0, ease:Expo.easeInOut })

		switch(types.oldType){
			case AppConstants.LANDING:
				break
			case AppConstants.EXPERIENCE:
				break
			case AppConstants.CAMPAIGN:
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
		var timeline = new TimelineMax(args)

		timeline.to(wrapper, 1, { opacity:0, ease:Expo.easeInOut })
		
		switch(types.oldType){
			case AppConstants.LANDING:
				break
			case AppConstants.EXPERIENCE:
				break
			case AppConstants.CAMPAIGN:
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
		var timeline = new TimelineMax(args)

		timeline.from(wrapper, 1, { opacity:0, ease:Expo.easeInOut })

		switch(types.oldType){
			case AppConstants.LANDING:
				break
			case AppConstants.EXPERIENCE:
				break
			case AppConstants.CAMPAIGN:
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
		var timeline = new TimelineMax(args)

		timeline.to(wrapper, 1, { opacity:0, ease:Expo.easeInOut })
		
		switch(types.oldType){
			case AppConstants.LANDING:
				break
			case AppConstants.EXPERIENCE:
				break
			case AppConstants.CAMPAIGN:
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
		var timeline = new TimelineMax(args)

		console.log(scope.compass)

		timeline.from(wrapper, 1, { opacity:0, ease:Expo.easeInOut })

		switch(types.oldType){
			case AppConstants.LANDING:
				break
			case AppConstants.EXPERIENCE:
				break
			case AppConstants.CAMPAIGN:
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
		var timeline = new TimelineMax(args)

		timeline.to(wrapper, 1, { opacity:0, ease:Expo.easeInOut })
		
		switch(types.oldType){
			case AppConstants.LANDING:
				break
			case AppConstants.EXPERIENCE:
				break
			case AppConstants.CAMPAIGN:
				break
			case AppConstants.NONE:
				break
		}
		timeline.pause(0)
		return timeline
	}
}

export default TransitionAnimations
