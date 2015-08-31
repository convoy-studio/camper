import autobind from 'Autobind'
import slug from 'to-slug-case'

class BaseComponent {
	constructor() {
		autobind(this)
		this.domIsReady = false
	}
	componentWillMount() {
	}
	componentDidMount() {
		this.domIsReady = true
	}
	render(childId, parentId, template, object) {
		this.componentWillMount()
		this.childId = childId
		this.parentId = parentId
		this.parent = (parentId instanceof jQuery) ? parentId : $(this.parentId)
		this.child = (template == undefined) ? $('<div></div>') : $(template(object))
		if(this.child.attr('id') == undefined) this.child.attr('id', slug(childId))
		this.child.ready(this.componentDidMount)

		// setTimeout(()=>{
		// 	this.componentDidMount()
		// }, 0)

		this.parent.append(this.child)
		// console.log(this.parent, this.child)
	}
	remove() {
		this.componentWillUnmount()
		this.child.remove()
	}
	componentWillUnmount() {
	}
}

export default BaseComponent

