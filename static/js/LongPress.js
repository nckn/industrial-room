import { Clock } from 'three'
import { TweenMax, Circ } from 'gsap'

export default class {
  constructor() {
    // Create variable for setTimeout
    this.delay = null;

    this.shouldScale = false;
    this.clock = null;
    this.reqAnim = null;
    this.elapsedTime = 0;
    this.oldTime = 0;
    
    // Set number of milliseconds for longpress
    this.longpress = 1300;
    
    this.scaler = document.querySelector('.dot');
    this.scalerNoise = document.querySelector('#theSvgNoiseShape');
    this.eventTaker = document.querySelector('.webgl');
    // this.listItems = document.getElementsByClassName('list-item');
    // this.listItem;
    console.log('setting up timer')

    this.multiplier = 1.1

    // this.makeTimer()
    this.setupTimer()
  }

  // makeTimer() {
  //   var _this = this;
  //   _this.clock = new Clock()
  // }

  setupTimer() {
    var _this = this;
    // _this.eventTaker.addEventListener('mousedown', function (e) {  
    document.addEventListener('pointerdown', function (e) {
      console.log('clicking document')
      _this.delay = setTimeout(check, _this.longpress);
      
      function check() {
        // _this.classList.add('is-selected');
        console.log('is pass the threshold')
        // _this.scaler.style.transformOrigin = '50% 50%'
        // _this.scaler.style.transform = `scale(${2})`
        // TweenMax.to(_this.scaler, 10, {css: {scale: 1 + _this.elapsedTime}, ease: Circ.easeIn});
        // TweenMax.set(_this.scaler, {css: {scale: 1 + _this.elapsedTime}, ease: Circ.easeIn});
        _this.clock = new Clock()
        _this.tick()
      }    
    }, true);
    
    document.addEventListener('pointerup', function (e) {
      // On mouse up, we know it is no longer a longpress
      clearTimeout(_this.delay);
      // Reset time
      // Cancel the animation
      cancelAnimationFrame( _this.reqAnim )
      _this.oldTime = _this.elapsedTime
      _this.clock = null
      // Scale back to 1
      setTimeout(() => {
        // TweenMax.set(_this.scaler, {css: {scale: 1}});
        TweenMax.set(_this.scalerNoise, {css: {scale: 1}});
      }, 1)
      _this.multiplier = 1
    });
    
  }

  tick() {
    var _this = this
    // this.elapsedTime = this.clock.getElapsedTime() - this.oldTime
    this.elapsedTime = this.clock.getElapsedTime()
    this.multiplier += 0.1
    // console.log('is scaling: ', this.elapsedTime)
    // Scale the dot
    // TweenMax.to(_this.scaler, 0.01, {css: {scale: (1 + (Math.exp(_this.elapsedTime)) )}, ease: Circ.easeIn});
    TweenMax.to(_this.scalerNoise, 0.01, {css: {scale: (1 + (Math.exp(_this.elapsedTime) * _this.multiplier) )}, ease: Circ.easeIn});
    this.reqAnim = requestAnimationFrame( () => {
      this.tick()
    })
  }

}