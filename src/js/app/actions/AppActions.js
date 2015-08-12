import AppConstants from 'AppConstants'
import AppDispatcher from 'AppDispatcher'

var AppActions = {
    pageHasherChanged: function(pageId) {
        AppDispatcher.handleViewAction({
            actionType: AppConstants.PAGE_HASHER_CHANGED,
            item: pageId
        })  
    },
    windowResize: function(windowW, windowH) {
        AppDispatcher.handleViewAction({
            actionType: AppConstants.WINDOW_RESIZE,
            item: { windowW:windowW, windowH:windowH }
        })
    },
    pxContainerIsReady: function(component) {
        AppDispatcher.handleViewAction({
            actionType: AppConstants.PX_CONTAINER_IS_READY,
            item: component
        })            
    },
    pxAddChild: function(child) {
        AppDispatcher.handleViewAction({
            actionType: AppConstants.PX_CONTAINER_ADD_CHILD,
            item: {child: child}
        })            
    },
    pxRemoveChild: function(child) {
        AppDispatcher.handleViewAction({
            actionType: AppConstants.PX_CONTAINER_REMOVE_CHILD,
            item: {child: child}
        })            
    }
}

export default AppActions


      
