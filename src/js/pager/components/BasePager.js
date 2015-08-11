// import React from 'react'
// import {PagerStore, PagerActions, PagerConstants, PagerDispatcher} from 'Pager'
// import _capitalize from 'lodash/String/capitalize'

// export default class BasePager extends React.Component {
// 	constructor(props) {
// 		super(props)
// 		this.currentPageDivRef = 'page-b'
// 		this.willPageTransitionIn = this.willPageTransitionIn.bind(this)
// 		this.willPageTransitionOut = this.willPageTransitionOut.bind(this)
// 		this.components = {
// 			'new-component': undefined,
// 			'old-component': undefined
// 		}
// 	}
// 	render() {
// 		return (
// 			<div id='pages-container'>
// 				<div style={this.divStyle} ref='page-a'></div>
// 				<div style={this.divStyle} ref='page-b'></div>
// 			</div>
// 		)
// 	}
// 	componentWillMount() {
// 		PagerStore.on(PagerConstants.PAGE_TRANSITION_IN, this.willPageTransitionIn)
// 		PagerStore.on(PagerConstants.PAGE_TRANSITION_OUT, this.willPageTransitionOut)
// 	}
// 	setupNewComponent(hash, Type) {
// 		var id = _capitalize(hash.replace("/", ""))
// 		this.oldPageDivRef = this.currentPageDivRef
// 		this.currentPageDivRef = (this.currentPageDivRef === 'page-a') ? 'page-b' : 'page-a'
// 		var el = React.findDOMNode(this.refs[this.currentPageDivRef])
// 		var page = 
// 			<Type 
// 				id={this.currentPageDivRef} 
// 				isReady={this.onPageReady} 
// 				hash={hash}
// 				didTransitionInComplete={this.didPageTransitionInComplete.bind(this)}
// 				didTransitionOutComplete={this.didPageTransitionOutComplete.bind(this)}
// 			/>
// 		this.components['old-component'] = this.components['new-component']
// 		this.components['new-component'] = React.render(page, el)
// 		if(PagerStore.pageTransitionState === PagerConstants.PAGE_TRANSITION_IN_PROGRESS) {
// 			this.components['old-component'].forceUnmount()
// 		}
// 	}
// 	onPageReady(hash) {
// 		PagerActions.onPageReady(hash)
// 	}
// 	willPageTransitionIn() {
// 		this.switchPagesDivIndex()
// 		this.components['new-component'].willTransitionIn()
// 	}
// 	willPageTransitionOut() {
// 		this.components['old-component'].willTransitionOut()
// 	}
// 	didPageTransitionInComplete() {
// 		// console.log('didPageTransitionInComplete')
// 		PagerActions.pageTransitionDidFinish()
// 		this.unmountComponent('old-component')
// 	}
// 	didPageTransitionOutComplete() {
// 		// console.log('didPageTransitionOutComplete')
// 		PagerActions.onTransitionOutComplete()
// 	}
// 	switchPagesDivIndex() {
// 		var newEl = React.findDOMNode(this.refs[this.currentPageDivRef])
// 		var oldEl = React.findDOMNode(this.refs[this.oldPageDivRef])
// 		newEl.style.zIndex = 2
// 		oldEl.style.zIndex = 1
// 	}
	// unmountComponent(ref) {
	// 	if(this.components[ref] !== undefined) {
	// 		var id = this.components[ref].props.id
	// 		var domToRemove = React.findDOMNode(this.refs[id])
	// 		React.unmountComponentAtNode(domToRemove)
	// 	}
	// }
	// componentWillUnmount() {
	// 	PagerStore.off(PagerConstants.PAGE_TRANSITION_IN, this.willPageTransitionIn)
	// 	PagerStore.off(PagerConstants.PAGE_TRANSITION_OUT, this.willPageTransitionOut)
	// 	this.unmountComponent('old-component')
	// 	this.unmountComponent('new-component')
	// }
// }


import BaseComponent from 'BaseComponent'
import {PagerStore, PagerActions, PagerConstants, PagerDispatcher} from 'Pager'
import _capitalize from 'lodash/String/capitalize'
import template from 'PagesContainer_hbs'
import AppStore from 'AppStore'

class BasePager extends BaseComponent {
	constructor() {
		super()
		this.currentPageDivRef = 'page-b'
		this.willPageTransitionIn = this.willPageTransitionIn.bind(this)
		this.willPageTransitionOut = this.willPageTransitionOut.bind(this)
		this.didPageTransitionInComplete = this.didPageTransitionInComplete.bind(this)
		this.didPageTransitionOutComplete = this.didPageTransitionOutComplete.bind(this)
		this.components = {
			'new-component': undefined,
			'old-component': undefined
		}
	}
	render(parent) {
		super.render('BasePager', parent, template, undefined)
	}
	componentWillMount() {
		PagerStore.on(PagerConstants.PAGE_TRANSITION_IN, this.willPageTransitionIn)
		PagerStore.on(PagerConstants.PAGE_TRANSITION_OUT, this.willPageTransitionOut)
		super.componentWillMount()
	}
	willPageTransitionIn() {
		this.switchPagesDivIndex()
		this.components['new-component'].willTransitionIn()
	}
	willPageTransitionOut() {
		this.components['old-component'].willTransitionOut()
	}
	didPageTransitionInComplete() {
		// console.log('didPageTransitionInComplete')
		PagerActions.pageTransitionDidFinish()
		this.unmountComponent('old-component')
	}
	didPageTransitionOutComplete() {
		// console.log('didPageTransitionOutComplete')
		PagerActions.onTransitionOutComplete()
	}
	switchPagesDivIndex() {
		var newComponent = this.components['new-component']
		var oldComponent = this.components['old-component']
		if(newComponent != undefined) newComponent.child.css('z-index', 2)
		if(oldComponent != undefined) oldComponent.child.css('z-index', 1)
	}
	setupNewComponent(hash, Type, template) {
		var id = _capitalize(hash.replace("/", ""))
		this.oldPageDivRef = this.currentPageDivRef
		this.currentPageDivRef = (this.currentPageDivRef === 'page-a') ? 'page-b' : 'page-a'
		var el = this.child.find('#'+this.currentPageDivRef)
		var props = {
			id: this.currentPageDivRef,
			isReady: this.onPageReady,
			hash: hash,
			didTransitionInComplete: this.didPageTransitionInComplete,
			didTransitionOutComplete: this.didPageTransitionOutComplete,
			data: AppStore.pageContent()
		}
		var page = new Type(props)
		page.render(id, el, template, props.data)
		this.components['old-component'] = this.components['new-component']
		this.components['new-component'] = page
		if(PagerStore.pageTransitionState === PagerConstants.PAGE_TRANSITION_IN_PROGRESS) {
			this.components['old-component'].forceUnmount()
		}
	}
	onPageReady(hash) {
		PagerActions.onPageReady(hash)
	}
	componentDidMount() {
		super.componentDidMount()
	}
	unmountComponent(ref) {
		if(this.components[ref] !== undefined) {
			this.components[ref].remove()
		}
	}
	componentWillUnmount() {
		PagerStore.off(PagerConstants.PAGE_TRANSITION_IN, this.willPageTransitionIn)
		PagerStore.off(PagerConstants.PAGE_TRANSITION_OUT, this.willPageTransitionOut)
		this.unmountComponent('old-component')
		this.unmountComponent('new-component')
		super.componentWillUnmount()
	}
}

export default BasePager

