import AppConstants from 'AppConstants'

class Utils {
	static NormalizeMouseCoords(e, objWrapper) {
		var posx = 0;
		var posy = 0;
		if (!e) var e = window.event;
		if (e.pageX || e.pageY) 	{
			posx = e.pageX;
			posy = e.pageY;
		}
		else if (e.clientX || e.clientY) 	{
			posx = e.clientX + document.body.scrollLeft
				+ document.documentElement.scrollLeft;
			posy = e.clientY + document.body.scrollTop
				+ document.documentElement.scrollTop;
		}
		objWrapper.x = posx
		objWrapper.y = posy
		return objWrapper
	}
	static ResizePositionProportionally(windowW, windowH, contentW, contentH, orientation) {
		var aspectRatio = contentW / contentH

		if(orientation !== undefined) {
			if(orientation == AppConstants.LANDSCAPE) {
				var scale = (windowW / contentW) * 1
			}else{
				var scale = (windowH / contentH) * 1
			}
		}else{
			var scale = ((windowW / windowH) < aspectRatio) ? (windowH / contentH) * 1 : (windowW / contentW) * 1
		}

		var newW = contentW * scale
		var newH = contentH * scale
		var css = {
			width: newW,
			height: newH,
			left: (windowW >> 1) - (newW >> 1),
			top: (windowH >> 1) - (newH >> 1),
			scale: scale
		}
		return css
	}
	static ResizePositionProportionallyWithAnchorCenter(windowW, windowH, contentW, contentH) {
		var aspectRatio = contentW / contentH
		var scale = ((windowW / windowH) < aspectRatio) ? (windowH / contentH) * 1 : (windowW / contentW) * 1
		var newW = contentW * scale
		var newH = contentH * scale
		var css = {
			width: newW,
			height: newH,
			left: (windowW >> 1),
			top: (windowH >> 1),
			scale: scale
		}
		return css
	}
	static Rand(min, max) {
		return Math.random() * (max - min) + min
	}
	static DegreesToRadians(degrees) {
		return degrees * (Math.PI / 180)
	}
    static RadiansToDegrees(radians) {
        return radians * (180 / Math.PI)
    }
    static Limit(v, min, max) {
    	return (Math.min(max, Math.max(min, v)));
    }
	static Closest(array, num) {
        var i=0;
	    var minDiff=2000;
	    var ans;
	    for(i in array){
			var m=Math.abs(num-array[i]);
			if(m<minDiff){ 
				minDiff=m; 
				ans=array[i]; 
			}
		}
	    return ans;
    }
    static SpringTo(item, toX, toY, index, spring, friction, springLength) {
    	var dx = toX - item.x
    	var dy = toY - item.y
		var angle = Math.atan2(dy, dx)
		var targetX = toX - Math.cos(angle) * (springLength * index)
		var targetY = toY - Math.sin(angle) * (springLength * index)
		item.vx += (targetX - item.x) * spring
		item.vy += (targetY - item.y) * spring
		item.vx *= friction
		item.vy *= friction
    }
}

export default Utils
