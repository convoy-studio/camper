// Avoid console errors for the IE crappy browsers
if ( ! window.console ) console = { log: function(){} };

import App from 'App'
import $ from 'jquery'
import TweenMax from 'gsap'
import raf from 'raf'
import pixi from 'pixi.js'
import PreloadJS from 'PreloadJS'

window.jQuery = window.$ = $
console.log(PreloadJS)

// Start App
var app = new App()
app.init()

malheureusement