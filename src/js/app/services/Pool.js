import op from 'objectpool'

export default class Pool {
	constructor() {
		this.timelines = op.generate(TimelineMax, { count: 4})
		this.pxContainers = op.generate(PIXI.Container, { count: 2})
	}
	getTimeline() {
		return this.timelines.get()
	}
	releaseTimeline(item) {
		this.timelines.release(item)
	}
	getContainer() {
		// console.log('get >>>>>>>>>>>>', item)
		return this.pxContainers.get()
	}
	releaseContainer(item) {
		// console.log('release <<<<<<<<<<<<<', item)
		this.pxContainers.release(item)
	}
}
