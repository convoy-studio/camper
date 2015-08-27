import AppStore from 'AppStore'
import Utils from 'Utils'

export default class ScrollBar {
    constructor(element) {
        this.element = element
        this.pageHeight = undefined
        this.scrollTarget = undefined
        this.newPosY = 0
        this.ease = 0.1
        this.mouseInDown = false
    }
    componentDidMount() {
        this.onMouseDown = this.onMouseDown.bind(this)
        this.onMouseMove = this.onMouseMove.bind(this)
        this.onMouseUp = this.onMouseUp.bind(this)

        this.grab = this.element.find(".scroll-grab.btn")
        this.grabEl = this.grab.get(0)
        this.grab.on("mousedown", this.onMouseDown)
        setTimeout(()=>{
            this.grabW = this.grab.width()
            this.grabH = this.grab.height()
        }, 0)
    }
    onMouseDown(e) {
        e.preventDefault()
        this.mouseInDown = true
        $(window).on("mousemove", this.onMouseMove)
        $(window).on("mouseup", this.onMouseUp)
    }
    onMouseUp(e) {
        e.preventDefault()
        this.mouseInDown = false
        this.killAllEvents()
    }
    onMouseMove(e) {
        e.preventDefault()
        var windowH = AppStore.Window.h
        var posY = (this.pageHeight / windowH ) * e.clientY
        this.scrollTargetHandler(posY)
    }
    setScrollTarget(val) {
        this.scrollTarget = val
    }
    killAllEvents() {
        $(window).off("mousemove", this.onMouseMove)
        $(window).off("mouseup", this.onMouseUp)
    }
    update() {
        var windowH = AppStore.Window.h
        var posY = Math.round((this.scrollTarget / this.pageHeight) * (windowH - this.grabH))
        if(isNaN(posY)) return
        this.newPosY += (posY - this.newPosY) * this.ease
        var p = this.newPosY
        Utils.Translate(this.grabEl, 0, p, 0)
    }
    resize() {
    }
    componentWillUnmount() {
        this.grab.off("mousedown", this.onMouseDown)
        this.killAllEvents()
    }
}
