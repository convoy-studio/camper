import AppStore from 'AppStore'
import AppConstants from 'AppConstants'
import Utils from 'Utils'

export default class CompassRings {
	constructor(parentContainer) {
		this.container = parentContainer
	}
	componentDidMount() {
		this.ringsContainer = AppStore.getContainer()
		this.titlesContainer = AppStore.getContainer()
		this.genderContainer = AppStore.getContainer()
		this.container.addChild(this.ringsContainer)
		this.container.addChild(this.titlesContainer)
		this.container.addChild(this.genderContainer)

		this.circles = []
		var ciclesLen = 6
		for (var i = 0; i < ciclesLen; i++) {
			var g = new PIXI.Graphics()
			this.circles.push(g)
			this.ringsContainer.addChild(g)
		}

		this.titles = []
		this.genders = []
		var globalContent = AppStore.globalContent()
		var elements = AppStore.elementsOfNature()
		var allGender = AppStore.allGender()
		var elementsTexts = globalContent.elements
		var genderTexts = globalContent.gender
		var fontSize = 30

		for (var i = 0; i < elements.length; i++) {
			var elementId = elements[i]
			var elementTitle = elementsTexts[elementId].toUpperCase()
			var txt = new PIXI.Text(elementTitle, { font: fontSize + 'px FuturaBold', fill: 'white', align: 'center' })
			txt.anchor.x = 0.5
			txt.anchor.y = 0.5
			this.titlesContainer.addChild(txt)
			this.titles.push({
				txt: txt,
				degBegin: this.getDegreesBeginForTitlesById(elementId),
			})
		}

		for (var i = 0; i < allGender.length; i++) {
			var genderId = allGender[i]
			var genderTitle = genderTexts[genderId].toUpperCase()
			var txt = new PIXI.Text(genderTitle, { font: fontSize + 'px FuturaBold', fill: 'white', align: 'center' })
			txt.anchor.x = 0.5
			txt.anchor.y = 0.5
			this.genderContainer.addChild(txt)
			this.genders.push({
				txt: txt,
				degBegin: this.getDegreesBeginForGenderById(genderId),
			})
		}
	}
	getDegreesBeginForTitlesById(id) {
		// be careful starts from center -90deg
		switch(id) {
			case 'fire': return -130
			case 'earth': return -50
			case 'metal': return 15
			case 'water': return 90
			case 'wood': return 165
		}
	}
	getDegreesBeginForGenderById(id) {
		// be careful starts from center -90deg
		switch(id) {
			case 'male': return -150
			case 'female': return -30
			case 'animal': return 90
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
			if(i==3) {
				this.drawAroundThreeGroupLines(lastR, r, g, lineW, color)
				this.drawGenders(r, color)
			}
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
		var offset = (this.radius / 270) * 44
		var scale = (this.radius / 270) * 1
		var r = r + offset
		for (var i = 0; i < titles.length; i++) {
			var title = titles[i]
			var angle = Utils.DegreesToRadians(title.degBegin)
			title.txt.rotation = angle + Utils.DegreesToRadians(90)
			title.txt.x = r * Math.cos(angle)
			title.txt.y = r * Math.sin(angle)
			title.txt.scale.x = scale
			title.txt.scale.y = scale
		}
	}
	drawGenders(r, color) {
		var genders = this.genders
		var offset = (this.radius / 270) * 34
		var scale = (this.radius / 270) * 1
		var r = r + offset
		for (var i = 0; i < genders.length; i++) {
			var gender = genders[i]
			var angle = Utils.DegreesToRadians(gender.degBegin)
			gender.txt.rotation = angle + Utils.DegreesToRadians(90)
			gender.txt.x = r * Math.cos(angle)
			gender.txt.y = r * Math.sin(angle)
			gender.txt.scale.x = scale
			gender.txt.scale.y = scale
		}
	}
	resize(radius) {
		var windowH = AppStore.Window.h
		this.radius = radius
		this.drawRings()
	}
	componentWillUnmount() {
		this.ringsContainer.removeChildren()
		this.titlesContainer.removeChildren()
		this.genderContainer.removeChildren()
		AppStore.releaseContainer(this.ringsContainer)
		AppStore.releaseContainer(this.titlesContainer)
		AppStore.releaseContainer(this.genderContainer)
	}
}
