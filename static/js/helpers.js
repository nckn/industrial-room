import SimplexNoise from 'simplex-noise'

const radians = (degrees) => {
  return degrees * Math.PI / 180;
}

const distance = (x1, y1, x2, y2) => {
  return Math.sqrt(Math.pow((x1 - x2), 2) + Math.pow((y1 - y2), 2));
}

const map = (value, start1, stop1, start2, stop2) => {
  return (value - start1) / (stop1 - start1) * (stop2 - start2) + start2
}

const generateRandomNumber = (min, max) => {
  var highlightedNumber = Math.random() * (max - min) + min
  // console.log(highlightedNumber)
  return highlightedNumber
}

const checkIfTouch = (e) => {
  var thisX, thisY
  if (e.touches != undefined) {
    thisX = e.touches[0].pageX
    thisY = e.touches[0].pageY
  }
  else {
    thisX = e.clientX
    thisY = e.clientY
  }
  return { x: thisX, y: thisY }
}

const createPoints = () => {
  const points = [];
  // how many points do we need
  const numPoints = 6;
  // used to equally space each point around the circle
  const angleStep = (Math.PI * 2) / numPoints;
  // the radius of the circle
  const rad = 75;

  for (let i = 1; i <= numPoints; i++) {
    // x & y coordinates of the current point
    const theta = i * angleStep;

    const x = 100 + Math.cos(theta) * rad;
    const y = 100 + Math.sin(theta) * rad;

    // store the point's position
    points.push({
      x: x,
      y: y,
      // we need to keep a reference to the point's original point for when we modulate the values later
      originX: x,
      originY: y,
      // more on this in a moment!
      noiseOffsetX: Math.random() * 1000,
      noiseOffsetY: Math.random() * 1000
    });
  }

  return points;
}

// Noise
const simplex = new SimplexNoise();
const noise = (x, y) => {
  return simplex.noise2D(x, y);
}

export { 
  radians,
  distance,
  map,
  generateRandomNumber,
  checkIfTouch,
  createPoints,
  noise
};
