class Vec2 {
	constructor(x, y) {
		this.x = x
		this.y = y
	}
	distanceTo(v) {
		return Math.sqrt( this.distanceToSquared( v ) )
	}
	distanceToSquared(v) {
		var dx = this.x - v.x, dy = this.y - v.y;
		return dx * dx + dy * dy;
	}
	length() {
		return Math.sqrt( this.x * this.x + this.y * this.y );
	}
	normalize() {
		return this.divideScalar( this.length() )
	}
	divideScalar(scalar) {
		if ( scalar !== 0 ) {
			var invScalar = 1 / scalar;
			this.x *= invScalar;
			this.y *= invScalar;
		} else {
			this.x = 0;
			this.y = 0;
		}
		return this;
	}
}

export default Vec2
