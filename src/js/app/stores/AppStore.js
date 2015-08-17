import AppDispatcher from 'AppDispatcher'
import AppConstants from 'AppConstants'
import {EventEmitter2} from 'eventemitter2'
import assign from 'object-assign'
import data from 'GlobalData'
import Router from 'Router'
import Utils from 'Utils'

function _pageRouteIdChanged(id) {
}
function _getPageContent() {
    var hashObj = Router.getNewHash()
    var contentId = data.routing[hashObj.hash].id
    var langContent = _getContentByLang(JS_lang)
    var pageContent = langContent[contentId]
    return pageContent
}
function _getMenuContent() {
    return data.menu
}
function _getContentByLang(lang) {
    return data.lang[lang]
}
function _getAppData() {
    return data
}
function _getDefaultRoute() {
    return data['default-route']
}
function _getGlobalContent() {
    var langContent = _getContentByLang(JS_lang)
    return langContent['global']
}
function _windowWidthHeight() {
    return {
        w: window.innerWidth,
        h: window.innerHeight
    }
}
var AppStore = assign({}, EventEmitter2.prototype, {
    emitChange: function(type, item) {
        this.emit(type, item)
    },
    pageContent: function() {
        return _getPageContent()
    },
    menuContent: function() {
        return _getMenuContent()
    },
    appData: function() {
        return _getAppData()
    },
    defaultRoute: function() {
        return _getDefaultRoute()
    },
    globalContent: function() {
        return _getGlobalContent()
    },
    mainImageUrl: function(id, responsiveArray) {
        return AppStore.baseMediaPath() + '/image/planets/' + id + '/main-' + AppStore.responsiveImageWidth(responsiveArray) + '.jpg'
    },
    baseMediaPath: function() {
        return AppStore.getEnvironment().static
    },
    getEnvironment: function() {
        return AppConstants.ENVIRONMENTS[ENV]
    },
    getLineWidth: function() {
        return 3
    },
    responsiveImageWidth: function(responsiveArray) {
        var windowW = AppStore.Window.w
        return Utils.Closest(responsiveArray, windowW)
    },
    responsiveImageSize: function(responsiveArray, baseWidth, baseHeight) {
        var baseW = baseWidth || AppConstants.MEDIA_GLOBAL_W
        var baseH = baseHeight || AppConstants.MEDIA_GLOBAL_H
        var responsiveWidth = AppStore.responsiveImageWidth(responsiveArray)
        var scale = (responsiveWidth / baseW) * 1
        var responsiveHeight = baseH * scale
        return [ responsiveWidth, responsiveHeight ]
    },
    planets: function() {
        return data.planets
    },
    elementsOfNature: function() {
        return data.elements
    },
    allGender: function() {
        return data.gender
    },
    productsData: function() {
        return data['products-data']
    },
    productsDataById: function(id) {
        var data = AppStore.productsData()
        return data[id]
    },
    Window: function() {
        return _windowWidthHeight()
    },
    addPXChild: function(item) {
        AppStore.PXContainer.add(item.child)
    },
    removePXChild: function(item) {
        AppStore.PXContainer.remove(item.child)
    },
    Mouse: undefined,
    PXContainer: undefined,
    Orientation: AppConstants.LANDSCAPE,
    dispatcherIndex: AppDispatcher.register(function(payload){
        var action = payload.action
        switch(action.actionType) {
            case AppConstants.PAGE_HASHER_CHANGED:
                _pageRouteIdChanged(action.item)
                AppStore.emitChange(action.actionType)
                break
            case AppConstants.WINDOW_RESIZE:
                AppStore.Window.w = action.item.windowW
                AppStore.Window.h = action.item.windowH
                AppStore.Orientation = (AppStore.Window.w > AppStore.Window.h) ? AppConstants.LANDSCAPE : AppConstants.PORTRAIT
                AppStore.emitChange(action.actionType)
                break
            case AppConstants.PX_CONTAINER_IS_READY:
                AppStore.PXContainer = action.item
                AppStore.emitChange(action.actionType)
                break
            case AppConstants.PX_CONTAINER_ADD_CHILD:
                AppStore.addPXChild(action.item)
                AppStore.emitChange(action.actionType)
                break
            case AppConstants.PX_CONTAINER_REMOVE_CHILD:
                AppStore.removePXChild(action.item)
                AppStore.emitChange(action.actionType)
                break

        }
        return true
    })
})


export default AppStore

