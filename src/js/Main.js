// Avoid console errors for the IE crappy browsers
if ( ! window.console ) console = { log: function(){} };

import App from 'App'
import TweenMax from 'gsap'
import raf from 'raf'
import $ from 'jquery'
import wheel from 'jquery-mousewheel'

window.jQuery = window.$ = $

wheel($)

// Start App
var app = new App()
app.init()
