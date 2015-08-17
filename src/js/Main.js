// Avoid console errors for the IE crappy browsers
if ( ! window.console ) console = { log: function(){} };

import App from 'App'
import $ from 'jquery'
import TweenMax from 'gsap'
import raf from 'raf'
import pixi from 'pixi.js'
import Preloader from 'Preloader'

window.Preloader = new Preloader()
window.jQuery = window.$ = $

// Start App
var app = new App()
app.init()
