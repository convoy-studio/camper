import AppStore from 'AppStore'
import AppConstants from 'AppConstants'
import Utils from 'Utils'

export default class CompassRings {
	constructor(parentContainer) {
		this.container = parentContainer
	}
	componentDidMount() {
		this.ringsContainer = new PIXI.Container()
		this.container.addChild(this.ringsContainer)

		this.circles = []
		var ciclesLen = 6
		for (var i = 0; i < ciclesLen; i++) {
			var g = new PIXI.Graphics()
			this.circles.push(g)
			this.ringsContainer.addChild(g)
		}

		this.titles = []
		var elements = AppStore.elementsOfNature()
		var elementsTexts = AppStore.globalContent().elements
		this.fontSize = 30
		for (var i = 0; i < elements.length; i++) {
			var elementId = elements[i]
			var elementTitle = elementsTexts[elementId].toUpperCase()
			var letters = elementTitle.split('')
			var texts = []
			for (var j = 0; j < letters.length; j++) {
				var txt = new PIXI.Text(letters[j], { font: this.fontSize + 'px FuturaBold', fill: 'white', align: 'left' })
				txt.anchor.x = 0.5
				txt.anchor.y = 0.5
				this.ringsContainer.addChild(txt)
				texts.push(txt)
			}
			this.titles.push({
				letters: texts,
				degBegin: this.getDegreesBeginForTitlesById(elementId)
			})
		}
	}
	getDegreesBeginForTitlesById(id) {
		switch(id) {
			case 'fire': return 135
			case 'earth': return 60
			case 'metal': return 330
			case 'water': return 270
			case 'wood': return 210
		}
	}
	drawRings() {
		var radiusMargin = this.radius / this.circles.length
		var len = this.circles.length + 1
		var lastR;
		var lineW = AppStore.getLineWidth()
		var color = 0xffffff
		for (var i = 1; i < len; i++) {
			var g = this.circles[i-1]
			var r;

			g.clear()

			// radius differences
			if(i == 1) r = radiusMargin * 0.18
			else if(i == 4) r = (lastR + radiusMargin) * 1.16
			else r = lastR + radiusMargin

			// lines
			if(i==3) this.drawAroundThreeGroupLines(lastR, r, g, lineW, color)
			if(i==6) {
				this.drawAroundFourGroupLines(lastR, r, g, lineW, color)
				this.drawTitles(r, color)
			}

			// circle
			this.drawCircle(g, r)

			lastR = r
		}
	}
	drawAroundThreeGroupLines(lastR, newR, g, lineW, color) {
		var leftTheta = (7 * Math.PI) / 6
		var rightTheta = (11 * Math.PI) / 6
		
		this.drawAroundLine(g, lineW, color, 0, -newR, 0, -lastR)
		
		var fromX = newR * Math.cos(leftTheta)
		var fromY = -newR * Math.sin(leftTheta)
		var toX = lastR * Math.cos(leftTheta)
		var toY = -lastR * Math.sin(leftTheta)
		this.drawAroundLine(g, lineW, color, fromX, fromY, toX, toY)

		fromX = newR * Math.cos(rightTheta)
		fromY = -newR * Math.sin(rightTheta)
		toX = lastR * Math.cos(rightTheta)
		toY = -lastR * Math.sin(rightTheta)
		this.drawAroundLine(g, lineW, color, fromX, fromY, toX, toY)
	}
	drawAroundFourGroupLines(lastR, newR, g, lineW, color) {
		var leftTopTheta = (11 * Math.PI) / 12
		var rightTopTheta = Math.PI / 12

		var leftBottomTheta = (5 * Math.PI) / 4
		var rightBottomTheta = (7 * Math.PI) / 4
		
		this.drawAroundLine(g, lineW, color, 0, -newR, 0, -lastR)
		
		var fromX = newR * Math.cos(leftTopTheta)
		var fromY = -newR * Math.sin(leftTopTheta)
		var toX = lastR * Math.cos(leftTopTheta)
		var toY = -lastR * Math.sin(leftTopTheta)
		this.drawAroundLine(g, lineW, color, fromX, fromY, toX, toY)

		fromX = newR * Math.cos(rightTopTheta)
		fromY = -newR * Math.sin(rightTopTheta)
		toX = lastR * Math.cos(rightTopTheta)
		toY = -lastR * Math.sin(rightTopTheta)
		this.drawAroundLine(g, lineW, color, fromX, fromY, toX, toY)

		fromX = newR * Math.cos(leftBottomTheta)
		fromY = -newR * Math.sin(leftBottomTheta)
		toX = lastR * Math.cos(leftBottomTheta)
		toY = -lastR * Math.sin(leftBottomTheta)
		this.drawAroundLine(g, lineW, color, fromX, fromY, toX, toY)

		fromX = newR * Math.cos(rightBottomTheta)
		fromY = -newR * Math.sin(rightBottomTheta)
		toX = lastR * Math.cos(rightBottomTheta)
		toY = -lastR * Math.sin(rightBottomTheta)
		this.drawAroundLine(g, lineW, color, fromX, fromY, toX, toY)
	}
	drawAroundLine(g, lineW, color, fromX, fromY, toX, toY) {
		g.lineStyle(lineW, color, 1)
		g.beginFill(color, 0)
		g.moveTo(fromX, fromY)
		g.lineTo(toX, toY)
		g.endFill()
	}
	drawCircle(g, r) {
		g.lineStyle(AppStore.getLineWidth(), 0xffffff, 1)
		g.beginFill(0xffffff, 0)
		
		g.moveTo(r, 0)

		var angle = 0
		var x = 0
		var y = 0
		var gap = Math.min((300 / this.radius) * 5, 10)
		var steps = Math.round(360 / gap)
		for (var i = -1; i < steps; i++) {
			angle = Utils.DegreesToRadians(i * gap)
			x = r * Math.cos(angle)
			y = r * Math.sin(angle)
			g.lineTo(x, y)
		};

		// close it
		angle = Utils.DegreesToRadians(360)
		x = r * Math.cos(angle)
		y = r * Math.sin(angle)
		g.lineTo(x, y)

		g.endFill()
	}
	drawTitles(r, color) {
		var titles = this.titles
		var r = r + 24
		for (var i = 0; i < titles.length; i++) {
			var title = titles[i]
			var letters = title.letters
			var degBegin = 240 + title.degBegin
			var deg, angle, x, y, letter, letterW;
			var totalDeg = degBegin
			var lettersLen = letters.length
			for (var j = 0; j < lettersLen; j++) {
				letter = letters[j]
				deg = totalDeg
				angle = Utils.DegreesToRadians(deg)
				letter.x = r * Math.cos(angle)
				letter.y = r * Math.sin(angle)
				letter.rotation = angle + Utils.DegreesToRadians(90)
				letterW = letter.width
				letterW = Utils.Limit(letterW, 21, 29)
				totalDeg += (letterW * 0.19)
			}
		}
	}
	resize(radius) {
		var windowH = AppStore.Window.h
		this.radius = radius
		this.drawRings()
	}
}
