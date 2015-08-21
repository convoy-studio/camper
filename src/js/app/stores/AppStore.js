import AppDispatcher from 'AppDispatcher'
import AppConstants from 'AppConstants'
import {EventEmitter2} from 'eventemitter2'
import assign from 'object-assign'
import data from 'GlobalData'
import Router from 'Router'
import Utils from 'Utils'

function _getPageContent() {
    var scope = _getPageId()
    var langContent = _getContentByLang(AppStore.lang())
    var pageContent = langContent[scope]
    return pageContent
}
function _getPageId() {
    return _getContentScope().id
}
function _getTypeOfNewAndOldPage() {
    var newHasher = Router.getNewHash()
    var oldHasher = Router.getOldHash()
    return { newType: _getTypeOfPage(newHasher), oldType: _getTypeOfPage(oldHasher) }
}
function _getTypeOfPage(hash) {
    var h = hash || Router.getNewHash()
    if(h == undefined) return AppConstants.NONE
    if(h.parts.length == 3) return AppConstants.CAMPAIGN
    else if(h.parts.length == 2) return AppConstants.EXPERIENCE
    else return AppConstants.LANDING
}
function _getContentScope() {
    var hashObj = Router.getNewHash()
    var routeScope;
    if(hashObj.parts.length > 2) {
        var parentPath = hashObj.hash.replace('/'+hashObj.targetId, '')
        routeScope = AppStore.getRoutePathScopeById(parentPath)
    }else{
        routeScope = AppStore.getRoutePathScopeById(hashObj.hash)
    }
    return routeScope
}
function _getPageAssetsToLoad() {
    var scope = _getContentScope()
    var hashObj = Router.getNewHash()
    var targetId;
    var type = _getTypeOfPage()
    targetId = type.toLowerCase() + '-assets'
    var manifest = _addBasePathsToUrls(scope[targetId], scope.id, targetId, type)
    return manifest
}
function _addBasePathsToUrls(urls, pageId, targetId, type) {
    var basePath = _getPageAssetsBasePathById(pageId, targetId)
    var manifest = []
    if(urls == undefined || urls.length < 1) return manifest
    for (var i = 0; i < urls.length; i++) {
        var splitter = urls[i].split('.')
        var fileName = splitter[0]
        var extension = splitter[1]
        manifest[i] = {
            id: pageId + '-' + type.toLowerCase() + '-' + fileName,
            src: basePath + fileName + '.' + extension
        }
    }
    return manifest
}
function _getPageAssetsBasePathById(id, assetGroupId) {
    return AppStore.baseMediaPath() + '/image/planets/' + id + '/' + assetGroupId + '/'
}
function _getMenuContent() {
    return data.menu
}
function _getContentByLang(lang) {
    return data.lang[lang]
}
function _getGeneralInfos() {
    return data.infos.lang[AppStore.lang()]
}
function _getAppData() {
    return data
}
function _getDefaultRoute() {
    return data['default-route']
}
function _getGlobalContent() {
    var langContent = _getContentByLang(AppStore.lang())
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
    countries: function() {
        return data.countries
    },
    appData: function() {
        return _getAppData()
    },
    lang: function() {
        return JS_lang
    },
    defaultRoute: function() {
        return _getDefaultRoute()
    },
    globalContent: function() {
        return _getGlobalContent()
    },
    generalInfos: function() {
        return data.infos
    },
    generalInfosLangScope: function() {
        return _getGeneralInfos()
    },
    mainImageUrl: function(id, responsiveArray) {
        return AppStore.baseMediaPath() + '/image/planets/' + id + '/main-' + AppStore.responsiveImageWidth(responsiveArray) + '.jpg'
    },
    baseMediaPath: function() {
        return AppStore.getEnvironment().static
    },
    getRoutePathScopeById: function(id) {
        return data.routing[id]
    },
    getPageId: function() {
        return _getPageId()
    },
    getTypeOfNewAndOldPage: function() {
        return _getTypeOfNewAndOldPage()
    },
    getTypeOfPage: function(hash) {
        return _getTypeOfPage(hash)
    },
    getEnvironment: function() {
        return AppConstants.ENVIRONMENTS[ENV]
    },
    getLineWidth: function() {
        return 3
    },
    pageAssetsToLoad: function() {
        return _getPageAssetsToLoad()
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
    getSpecificProductById: function(planetId, productId) {
        var planetProducts = AppStore.productsDataById(planetId)
        for (var i = 0; i < planetProducts.length; i++) {
            if(productId == planetProducts[i].id) {
                return planetProducts[i]
            }
        }
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
    getTimeline: function() {
        return AppStore.Pool.getTimeline()
    },
    releaseTimeline: function(item) {
        return AppStore.Pool.releaseTimeline(item)
    },
    getContainer: function() {
        return AppStore.Pool.getContainer()
    },
    releaseContainer: function(item) {
        return AppStore.Pool.releaseContainer(item)
    },
    getGraphics: function() {
        return AppStore.Pool.getGraphics()
    },
    releaseGraphics: function(item) {
        return AppStore.Pool.releaseGraphics(item)
    },
    getSprite: function() {
        return AppStore.Pool.getSprite()
    },
    releaseSprite: function(item) {
        return AppStore.Pool.releaseSprite(item)
    },
    getSpringGarden: function() {
        return AppStore.Pool.getSpringGarden()
    },
    releaseSpringGarden: function(item) {
        return AppStore.Pool.releaseSpringGarden(item)
    },
    Pool: undefined,
    Preloader: undefined,
    Mouse: undefined,
    PXContainer: undefined,
    Orientation: AppConstants.LANDSCAPE,
    dispatcherIndex: AppDispatcher.register(function(payload){
        var action = payload.action
        switch(action.actionType) {
            case AppConstants.PAGE_HASHER_CHANGED:

                // Try to catch the internal hash change for the 3 parts pages ex. /planet/wood/0
                var newHasher = Router.getNewHash()
                var oldHasher = Router.getOldHash()
                var actionType = AppConstants.PAGE_HASHER_CHANGED
                if(oldHasher != undefined) {
                    if(newHasher.parts.length == 3 && oldHasher.parts.length == 3) {
                        actionType = AppConstants.PAGE_HASHER_INTERNAL_CHANGE
                    }
                }

                AppStore.emitChange(actionType)
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

