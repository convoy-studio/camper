// Avoid console errors for the IE crappy browsers
if ( ! window.console ) console = { log: function(){} };

import App from 'App'
import $ from 'jquery'
import TweenMax from 'gsap'
import raf from 'raf'
import FastClick from 'fastclick'
window.jQuery = window.$ = $

FastClick(document.body)

// Start App
var app = new App()
app.init()

