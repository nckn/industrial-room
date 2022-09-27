import './assets/scss/main.scss'

import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js'
import portalVertexShader from './shaders/portal/vertex.glsl'
import portalFragmentShader from './shaders/portal/fragment.glsl'
//
import gsap, { Sine, Power3, Power4, Expo } from 'gsap'
import ASScroll from '@ashthornton/asscroll'
import * as dat from 'dat.gui'

// Misc helper functions
import {
  checkIfTouch,
  map,
  createPoints
} from '../static/js/helpers.js'
// Longpress
import LongPress from '../static/js/LongPress.js'
// Where we import characters
import AnimatedChar from './assets/js/Animation'

// Not in use
// import SimplexNoise from 'simplex-noise'

let video = null

// Animation
const stdTime = 1.25

// the geometry on which the movie will be displayed;
// 		movie image will be scaled to fit these dimensions.

// /**
//  * Spector JS
//  */
// const SPECTOR = require('spectorjs')
// const spector = new SPECTOR.Spector()
// spector.displayUI()

// Audio example
// https://github.com/mrdoob/three.js/blob/master/examples/webaudio_sandbox.html

/**
 * Sizes
 */
 const sizes = {
  width: window.innerWidth,
  height: window.innerHeight
}

let camera = null
let renderer = null
let controls = null
let effectComposer = null
let renderTarget = null
let clock = null

let posSpotLightTL = null

// Canvas
const canvas = document.querySelector('canvas.webgl')
// Preloader and play buttons
const preloaderOverlay = document.querySelector('.loader-overlay')
const playButton = document.querySelector('.sound-button')

// Scene
const scene = new THREE.Scene()
const color = 0xffffff
const near = 20
const far = 40
scene.background = new THREE.Color(0xffffff)
scene.fog = new THREE.Fog(color, near, far)

let uniforms = ''

const sounds = [
  {name: 'table', path: 'computer-typing_mechanical-keyboard.mp3', volume: 0.25},
  {name: 'boxLightSmall', path: 'hum-also-known-as-sun.mp3', volume: 0.05}
]
let canPassSound = false
let soundspumpeStok = [
  'pumpestok-empty.mp3',
  'pumpestok-empty-1.mp3',
  'pumpestok-empty-2.mp3'
]

/**
 * Loaders
 */
// Texture loader
const textureLoader = new THREE.TextureLoader()
// Draco loader
const dracoLoader = new DRACOLoader()
dracoLoader.setDecoderPath('draco/')

/**
 * Textures
 */
// const bakedTextureFloor = textureLoader.load('textures/USE-3D-website-1.4-2048px-less-dark.png') // trans
// bakedTextureFloor.flipY = false
// bakedTextureFloor.encoding = THREE.sRGBEncoding

/**
 * Materials
 */
// Texture material png with see-through bg color
// const bakedMaterialFloor = new THREE.MeshPhongMaterial({ 
//   map: bakedTextureFloor,
//   color: 0xffffff,
//   transparent: true,
//   opacity: 0.5
//   // emissive: 0xffffff,
//   // emissiveIntensity: 0.4
// })
// bakedMaterialFloor.onBeforeCompile = function ( shader ) {
//   var custom_map_fragment = THREE.ShaderChunk.map_fragment.replace(
//     `diffuseColor *= texelColor;`,
//     `diffuseColor = vec4( mix( diffuse, texelColor.rgb, texelColor.a ), opacity );`
//   )
//   shader.fragmentShader = shader.fragmentShader.replace( '#include <map_fragment>', custom_map_fragment )
// }

// Debug
let gui = new dat.GUI({
  width: 400
})
dat.GUI.toggleHide()

export default class Setup {
  constructor() {
    // Debug object if needed
    this.debugObject = {}

    this.animatedCharacters = []

    this.INTERSECTED = ''
    this.intS = null
    this.intersectedObject = null
    this.showAnnotation = true
    this.meshes = []
    this.popover = document.querySelector('.popover')

    this.videoTexture = null
    this.videoMaterial = null
    this.videoTemplateFrame = null
    this.videoTemplateScreen = null
    this.videoMesh = null

    // Particles
    this.pointclouds = null
    // this.raycaster = null
    // this.intersection = null
    this.spheresIndex = 0
    // this.clock = null
    this.toggle = 0
    this.pointer = new THREE.Vector2()
    this.spheres = []
    this.threshold = 0.1
    this.pointSize = 0.02
    this.pWidth = 30
    this.pLength = 30
    // this.rotateY = new THREE.Matrix4().makeRotationY(0.005)
    this.whiteBoard = null
    this.markerWhiteBoard = null
    this.markerWhiteBoardOrgPos = null

    this.particles = []
    this.pumpeStokPump = null
    
    this.lines = []
    this.lineInc = 0
    this.count = 0
    this.linePositions = null
    this.allLinePositions = []
    this.newDrawPos = new THREE.Vector3()
    // Set hover booleans
    this.pointerOverWhiteBoard = false
    this.pointerOverPumpeStok = false

    // General
    this.isMouseDown = false

    // GLTF loader
    this.gltfLoader = new GLTFLoader()
    this.gltfLoader.setDRACOLoader(dracoLoader)

    // To store all sounds
    this.allSounds = []

    // To be tatoo material
    this.portalLightMaterial = null
    this.upperBodyMesh = null
    
    this.masterInit()

    // this.simplex = new SimplexNoise()

    // Add DOM events
    this.addEventListeners()

    // this.asscroll = new ASScroll({
    //   disableRaf: true
    // })

    this.initASScroll()
  }

  // Init the smooth scroll library
  initASScroll() {
    this.asscroll = new ASScroll({
      disableRaf: true,
      containerElement: document.querySelector(
        '[asscroll-container]'
      ),
      // ease: 1
      // ease: 0.105 // The ease amount for the transform lerp. Default is 0.075
    })
    // window.addEventListener('load', () => {
    //   this.asscroll.enable()
    // })
  }

  masterInit() {
    // this.makeShaderMaterial() // First lets make the shader material since dat gui needs it
    this.setupTweakGui() // Secondly lets setup tweak gui
    this.init()
    
    // Setup audio listener and loader 
    this.setupNecessaryAudio()
    
    // Load the scene
    this.loadScene()
    
    // Load the scene
    // this.loadOtherGlbs()

    // postprocessing
    // Good for a little bit of shine
    // this.initPostprocessing()

    // Tooltip animation *
    this.initTooltipAnim()

    // Setup long press logic
    this.setupLongPressLogic()
    this.addLights()
    
    this.addFloor()

    this.setupCoffeeParticles()

    // this.prepareLineGeometry()

  }

  setupCoffeeParticles() {
    // First make a group for all spawned particles
    this.groupCoffee = new THREE.Group()
    var pts = []
    for (let i = 0; i < 20; i++) {
      // pts.push(new THREE.Vector3(Math.random() - 0.1, Math.random() - 0.1, Math.random() - 0.1));
      pts.push(new THREE.Vector3(0, Math.random() - 0.1, 0.5))
    }
    var geom = new THREE.BufferGeometry().setFromPoints(pts)
    var mat = new THREE.PointsMaterial({
      // size: Math.random() * (0.4 - 0.07) + 0.07,
      size: 0.04,
      color: 'brown'
    })
    uniforms = {
      time: {
        value: 0
      },
      highY: {
        value: 1
      },
      lowY: {
        value: 0
      }
    }
    mat.onBeforeCompile = shader => {
      shader.uniforms.time = uniforms.time;
      shader.uniforms.highY = uniforms.highY;
      shader.uniforms.lowY = uniforms.lowY;
      // console.log(shader.vertexShader);
      shader.vertexShader = `
        uniform float time;
        uniform float highY;
        uniform float lowY;
      ` + shader.vertexShader;
      shader.vertexShader = shader.vertexShader.replace(
        `#include <begin_vertex>`,
        `#include <begin_vertex>  
        float totalY = highY - lowY;
        transformed.y = highY - mod(highY - (transformed.y - time * 20.), totalY);
        `
      );
    }
    var points = new THREE.Points(geom, mat);
    this.groupCoffee.add(points);
    this.groupCoffee.position.x = -4.33
    this.groupCoffee.position.y = 0.76
    this.groupCoffee.position.z = 2
    scene.add(this.groupCoffee);
  }

  init() {
    var self = this

    /**
     * Camera
     */
    // Base camera - perspective
    // camera = new THREE.PerspectiveCamera(45, sizes.width / sizes.height, 0.1, 1000)
    // Base camera - orthographic
    const camDivision = 100
    camera = new THREE.OrthographicCamera( sizes.width / - camDivision, sizes.width / camDivision, sizes.height / camDivision, sizes.height / - camDivision, 1, 1000 )

    // camera.position.set( 5, 5, 5 )
    // {x: -9.876019022171759, y: 7.993364654239245, z: 9.768794174867386}
    // camera.position.set( -9.87, 7.99, 9.77 )
    camera.position.set( 0, 10, 0 )
    camera.lookAt( 0, 0, 0 )
    
    // camera group
    this.groupCamera = new THREE.Group()
    this.groupCamera.add( camera );
    
    // scene.add(camera)
    scene.add(this.groupCamera)

    this.makeMaterialForVideo()

    // this.setOrbitControls()

    /**
     * Renderer
     */
    renderer = new THREE.WebGLRenderer({
      canvas: canvas,
      antialias: true
    })
    renderer.setSize(sizes.width, sizes.height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.outputEncoding = THREE.sRGBEncoding

    // Make clock
    clock = new THREE.Clock()

    window.addEventListener('resize', this.onResize)  
  }

  makeMaterialForVideo() {
    // Video texture related - start
    video = document.getElementById( 'video' )
    this.videoTexture = new THREE.VideoTexture( video )
    this.videoTexture.minFilter = THREE.LinearFilter
    this.videoTexture.magFilter = THREE.LinearFilter
    
    const scaleFactor = 0.16
    const videoGeometry = new THREE.PlaneGeometry( 16, 9 )
    videoGeometry.scale( scaleFactor, scaleFactor, scaleFactor )
    // videoGeometry.position.copy(this.videoTemplate.position)
    
    this.videoMaterial = new THREE.MeshBasicMaterial( {
      map: this.videoTexture,
      overdraw: true,
      side:THREE.DoubleSide,
      // color: 0xff0000
    } )
    
    this.videoMesh = new THREE.Mesh( videoGeometry, this.videoMaterial )
    // scene.add( this.videoMesh )

    // const mesh = new THREE.Mesh( geometry, this.videoMaterial )
    // scene.add( mesh )
    // Video texture related - end
  }

  turnOnVideoCall() {
    var self = this
    // Get video elem
    video = document.getElementById( 'video' )
    // console.log('getting this far - 1')
    // console.log('navigator')
    // console.log(navigator.getUserMedia)
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      // console.log('getting this far - 2')
      const constraints = {
        video: { width: 1280, height: 720, facingMode: 'user' }
      }

      navigator.mediaDevices
        .getUserMedia(constraints)
        .then(function (stream) {
          console.log('we have video working')
          // apply the stream to the video element used in the texture

          video.srcObject = stream
          video.play()

        })
        .catch(function (error) {
          console.error('Unable to access the camera/webcam.', error)
        })
    } else {
      console.error('MediaDevices interface not available.')
    }

    // In any case move the videoMesh to the template from Blender
    // this.videoMesh.position.copy(this.videoTemplate.position)
    
    // console.log('this.videoTemplate.position')
    // console.log(this.videoTemplateFrame.position)

    this.videoMesh.position.copy(new THREE.Vector3(
      this.videoTemplateFrame.position.x,
      this.videoTemplateFrame.position.y,
      this.videoTemplateFrame.position.z
    ))
    scene.add( this.videoMesh )
    this.videoTemplateScreen.visible = false
    // const scale = new THREE.Vector3(1, 1, 1);
    // scale.x *= -1 
    // // scale.z *= -1
    // this.videoMesh.scale.multiply(scale)
  }

  // placeWebCamGeometry() {
  //   var self = this
    
  //   const texture = new THREE.VideoTexture( video );
  //   const geometry = new THREE.PlaneGeometry( 16, 9 );
  //   geometry.scale( 0.5, 0.5, 0.5 );
  //   const material = new THREE.MeshBasicMaterial( { map: texture } );
  //   const mesh = new THREE.Mesh( geometry, material )
  //   scene.add.bind( mesh )
  // }

  setOrbitControls() {
    // Controls
    controls = new OrbitControls(camera, canvas)
    controls.enableDamping = true
    controls.enablePan = false
    // Set max polar angle
    // controls.maxPolarAngle = (Math.PI * 0.5) * 0.99 // Allow to go to floor level
    controls.maxPolarAngle = (Math.PI * 0.45) * 0.99
    controls.minDistance = 12
    controls.maxDistance = 20
    controls.addEventListener('change', _ => {
      // console.log('camera distance: ', camera.position)
    })
    controls.enabled = false
  }

  loadScene() {
    var self = this
    /**
     * Model
     */
    this.gltfLoader.load(
      // 'models/daniel_mixamo-animations.glb', // Mine from landscape-playground.blend
      // 'models/office-life.glb', // Mine from landscape-playground.blend
      // 'models/office-life-1.9.glb', // Mine from landscape-playground.blend
      'models/typography-in-3d_1a.glb', // Mine from landscape-playground.blend
      (gltf) => {
        // Traverse scene if wanting to look for things and names
        gltf.scene.traverse( child => {
          
          // Log the object / mesh name
          // console.log(child.name)

          // child.material = bakedMaterial
          // Add each child to the meshes array
          this.meshes.push(child)
          // Assign ID to mesh
          child.userData.id = 0

          // First hide all the objects we do not want to see 
          if (child.name === 'plant-template') {
            child.visible = false
          }

          // Scale the floor. Should not as the baked texture would not look nice
          if (child.name === 'floor') {
            child.visible = false
            // console.log('it is too')
            // console.log(child)
            // child.scale.set(30, 1, 30)
            // return
            // TODO fighting with getting floor to behave nice
            // child.material = bakedMaterialFloor
            // child.receiveShadow = false
            // child.position.y = 0.1
            // child.position.set(5, 5, 5)
          }

          if (child.material) {
            child.material.flatShading = false
          }
          
          // If there is a spotlight then place the shader that fits it
          if (
            child.name === 'SpotLightTL' ||
            child.name === 'SpotLightTR' 
          ) {
            // Clone pos of spotLightTL
            posSpotLightTL = child.position.clone()
            // console.log(posSpotLightTL)
            setup.addGodRays(posSpotLightTL)
          }

          // Add the sounds
          let id = null
          if (child.name === 'table') {
            id = 0
            canPassSound = true
          }
          if (child.name === 'lightBoxSmall') {              
            id = 1
            canPassSound = true
          }
          if (child.name === 'lightBoxSmall') {              
            id = 1
            canPassSound = true
          }
          if (canPassSound) {
            self.loadSound(id, child)
            canPassSound = false
          }

          if (child.name === 'tv-frame') {
            this.videoTemplateFrame = child
          }
          
          if (child.name === 'tv-screen') {
            child.material = this.videoMaterial
            this.videoTemplateScreen = child
            // this.videoTemplate = child
          }
          
        })

        // lightBoxLarge.visible = false
        // boxLightLarge.visible = false

        scene.add(gltf.scene)

        // self.upperBodyMesh = gltf.scene.children.find(
        //   child => child.name === 'body_upper_Vert017'
        // )
        // self.upperBodyMesh.material = self.portalLightMaterial

        // Reveal navigation items
        setTimeout(_ => {
          this.navigationAnimation()
        }, 2000)
        
        // Instantiate character
        // Daniel
        const charDaniel = new AnimatedChar({
          scene,
          camera,
          loader: this.gltfLoader,
          modelPath: 'models/daniel_mixamo-animations-1c.glb',
          modelTexturePath: '',
          charName: 'daniel',
          customMaterial: this.portalLightMaterial
        })

        // Add character to meshes array
        // this.meshes.push(charDaniel.model)

        // this.animatedCharacters.push(charStacey)
        this.animatedCharacters.push(charDaniel)
        // console.log('charDaniel')
        // console.log(charDaniel)

        // All is loaded now animate
        this.tick()
      }
    )
  }

  // Load props such as marker
  loadOtherGlbs() {
    var self = this
    this.gltfLoader.load(
      'models/marker-whiteboard.glb',
      gltf => {
        gltf.scene.traverse( child => {
          if (child.name === 'Cylinder') {
            this.markerWhiteBoard = child
            // this.markerWhiteBoardOrgPos = {...child.position}
            this.modifyProps()
            // this.markerWhiteBoard.position.y += 3
          }
        })
        scene.add(gltf.scene)
      }
    )
  }
  
  modifyProps() {
    // await this.markerWhiteBoard.position.copy(this.whiteBoard.position)
    // x: -0.029773712158203125, y: 27.43221664428711, z: -0.00000762939453125
    this.markerWhiteBoard.position.set(-2.8, 2.43, -4.65)
    this.markerWhiteBoardOrgPos = this.markerWhiteBoard.position
    console.log('this.markerWhiteBoard.position')
    console.log(this.markerWhiteBoard.position)
    this.markerWhiteBoard.rotation.z = Math.PI / 2
    // this.markerWhiteBoard.position.y += 3
  }

  addLights() {
    console.log('adding in lights')
    
    // Point light
    // this.pointLight = new THREE.PointLight({
    //   color: 0xffffff,
    //   intensity: 0.5,
    //   decay: 0.5
    // })
    // this.pointLight.position.set(2, 4, 2)
    // scene.add(this.pointLight)

    // Ambient light
    const light = new THREE.AmbientLight( 0x909090 ) // soft white light
    scene.add( light )
    
    // Directional light
    this.directionalLight = new THREE.DirectionalLight(0xffffff, 0.75)
    this.directionalLight.position.set(0, 8, 0)
    scene.add(this.directionalLight)
  }
  
  addFloor() {
    const geometry = new THREE.PlaneBufferGeometry( 10, 10 );
    const material = new THREE.MeshBasicMaterial( {color: 0xffffff, side: THREE.DoubleSide} );
    const plane = new THREE.Mesh( geometry, material );
    plane.rotation.set(Math.PI / 2, 0, 0)
    plane.position.y = -0.1
    scene.add( plane );
  }

  setupLongPressLogic() {
    var self = this
    let longPrss = new LongPress();
    // TODO: Look into webgl-mouse-hover or something, to see
    // how to handle callbacks and return functions
  }

  setupNecessaryAudio() {
    var self = this
    // Create a listener
    this.listener = new THREE.AudioListener()
    camera.add( this.listener )
    // Create sound loader
    this.audioLoader = new THREE.AudioLoader()
  }

  loadSound(soundIndex, parent) {
    var self = this
    var sound = new THREE.PositionalAudio( self.listener );
    // console.log('sound index: ', 'sound/' + sounds[ soundIndex ])
    // return
    this.audioLoader.load( 'sound/' + sounds[ soundIndex ].path, function ( buffer ) {
      sound.setBuffer( buffer )
      sound.setRefDistance( 20 )
      sound.setLoop( true )
      sound.setVolume( sounds[ soundIndex ].volume )
      sound.play() 
      parent.add( sound )
      // sounds.audio = sound
      // console.log('its working alright')
    })

    // store sound and add to global array
    const analyser = new THREE.AudioAnalyser( sound, 32 );
    this.allSounds.push( {snd: sound, analyser: analyser, parent: parent} )
  }

  onWheel(e) {
    // console.log(e)
    console.log('deltaY')
    console.log(e)
    const cameraPos = e.deltaY * 0.1
    // this.groupCamera.position.z += cameraPos
    gsap.to(this.groupCamera.position, 1, {
      z: cameraPos + this.groupCamera.position.z
    })

  }

  setPosition() {
    // console.log(this.asscroll.controller.delta)
    console.log(this.asscroll.currentPos)
    camera.position.x = this.asscroll.currentPos
    // if(!this.animationRunning){
    //   this.imageStore.forEach(o=>{
    //     o.mesh.position.x = -this.asscroll.currentPos + o.left - this.width/2 + o.width/2;
    //     o.mesh.position.y = -o.top + this.height/2 - o.height/2;
    //   })
    // }
  }

  tick() {
    var self = this
    // console.log('rendering')

    // get elapsed time
    const elapsedTime = clock.getElapsedTime()

    // this.asscroll.update()
    // this.setPosition()

    uniforms.time.value = clock.getElapsedTime() * 0.1
    
    // Update the characters and their animation
    if (this.animatedCharacters.length > 0) {
      this.animatedCharacters.map( anim => {
        anim.update()
      })
    }

    // Update controls
    // if (!this.isMouseDown && this.pointerOverWhiteBoard) {
    //   controls.enabled = false
    // }
    // else {
    //   controls.enabled = true
    // }
    // controls.update()
  
    // Render
    renderer.render(scene, camera)
    // effectComposer.render() // postprocessing
  
    if (self.intersectedObject) {

      // tooltip *
      self.updateScreenPosition();
    }

    // camera.lookAt(0,0,camera.position.z)
    // camera.lookAt(0,0,20)

    // Call tick again on the next frame
    window.requestAnimationFrame( () => {
      this.tick()
    } )
  }

  createANewParticle(pos) {
    // console.log('creating new particle')
    const sphereGeometry = new THREE.SphereGeometry(0.02, 4, 4)
    const sphereMaterial = new THREE.MeshBasicMaterial({ color: 0x0000ff })
    const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial)
    sphere.position.set(pos.x, pos.y, pos.z)
    this.particles.push(sphere)
    scene.add(sphere)
  }

  updateParticles() {
    // console.log('check for drawing')
    // Raycaster is created first time on pointermove.
    // If it doesnt exist then just exit method
    if (this.raycaster === undefined || this.whiteBoard === null) {
      return
    }
    const intersections = this.raycaster.intersectObjects([this.whiteBoard])
    // const intersections = this.raycaster.intersectObjects(this.pointclouds)
    this.intersection = intersections.length > 0 ? intersections[0] : null

    if (this.intersection === null) {
      return
    }

    if (!this.isMouseDown) {
      return
    }

    // Set position of marker
    // gsap.to(this.markerWhiteBoard.position, 0.1, {
    //   x: this.intersection.point.x + 0.1,
    //   y: this.intersection.point.y,
    //   z: this.intersection.point.z,
    // })
    // gsap.to(this.markerWhiteBoard.scale, 0.1, {
    //   x: 0.05,
    //   y: 0.05,
    //   z: 0.05,
    // })
    // this.markerWhiteBoard.position.copy(this.intersection.point)
    // this.markerWhiteBoard.position.z -= 1

    // Drawing - Make a line 
    // this.updateLine(this.intersection.point)
    
    // Drawing - Make spheres
    this.createANewParticle(this.intersection.point)

  }
  
  onResize() {
    var self = this

    console.log('resize')
    
    // Update sizes
    sizes.width = window.innerWidth
    sizes.height = window.innerHeight

    // Update camera
    renderer.setSize(sizes.width, sizes.height)
    camera.aspect = sizes.width / sizes.height
    camera.updateProjectionMatrix()

    // Update renderer
    // renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  }

  // Add DOM events
  addEventListeners() {
    var self = this

    // // preloader
    // playButton.addEventListener('click', () => {
    //   console.log('play')
    //   self.listener.context.resume()
    //   preloaderOverlay.classList.add('loaded')
    //   // video.play();
    //   // self.masterInit()
    // })
    // // preloader

    window.addEventListener( 'keydown', function ( event ) {
      console.log('key code: ', event.keyCode)
      switch ( event.keyCode ) {
        case 71: // H for header and hide
        dat.GUI.toggleHide()
        break
      }
    })

    // Add event listener
    window.addEventListener('touchmove', (e) => {
      self.pointerEventHappens(e)
    }, false)
    window.addEventListener('mousemove', (e) => {
      self.pointerEventHappens(e)
    }, false)

    window.addEventListener('pointermove', self.pointerEventHappens.bind(this), false)
    window.addEventListener('touchstart', self.onMouseDown.bind(this), false)
    window.addEventListener('pointerdown', self.onMouseDown.bind(this), false)
    window.addEventListener('touchstend', self.onMouseUp.bind(this), false)
    window.addEventListener('pointerup', self.onMouseUp.bind(this), false)
    
    window.addEventListener('wheel', self.onWheel.bind(this), false)

    this.setupKeyPresses()

  }

  setupKeyPresses() {
    var self = this
    // var { camera } = this.state
    document.addEventListener('keyup', (e) => {
      // console.log('yes: ', e)
      if (e.code === 'KeyR') {
        // console.log(camera)
        gsap.to(camera.position, 1.4, {x: 0.0, y: 4, z: 0.02, ease: Sine.ease})
      }
      if (e.key === 'o') {
        // this.controls.enabled = !this.controls.enabled
      }
      // Setup keyboard keys as keys
      // this.playKey({keyCode: e.code})
      // if (e.code === 'KeyA') {
      // }
    })
  }

  // Function that returns a raycaster to use to find intersecting objects
  // in a scene given screen pos and a camera, and a projector
  getRayCasterFromScreenCoord (screenX, screenY, camera) {
    var self = this
    var raycaster = new THREE.Raycaster()
    var mouse3D = new THREE.Vector3();
    // Get 3D point form the client x y
    mouse3D.x = (screenX / window.innerWidth) * 2 - 1;
    mouse3D.y = -(screenY / window.innerHeight) * 2 + 1;
    mouse3D.z = 0.5;
    raycaster.setFromCamera(mouse3D, camera)
    return raycaster
  }

  // Add event listener
  pointerEventHappens(e) {
    var self = this
    var mouseCoords = checkIfTouch(e)
    if (self.gplane && self.mouseConstraint) {
      var pos = self.projectOntoPlane(mouseCoords.x, mouseCoords.y, self.gplane, self.camera);
      if (pos) {
        var yDiff = self.mouseDownPos.y - pos.y
        self.setClickMarker(pos.x - yDiff**2, pos.y, pos.z, self.scene);
        self.moveJointToPoint(pos.x - yDiff**2, pos.y, pos.z);
      }
    }
    // return
    var mouseCoords = checkIfTouch(e)
    this.raycaster = self.getRayCasterFromScreenCoord(mouseCoords.x, mouseCoords.y, camera);
    // Find the closest intersecting object
    // Now, cast the ray all render objects in the scene to see if they collide. Take the closest one.
    var intersects = this.raycaster.intersectObjects(self.meshes);
    
    // Intersected object
    self.intS = self.INTERSECTED
    // self.intersectedObject = self.INTERSECTED // Because intS follows specific hover rules

    // Update particles
    this.updateParticles()

    // This is where an intersection is detected
    if ( intersects.length > 0 ) {
      if ( self.intS != intersects[ 0 ].object ) {
        // if ( self.intS ) {
        //   self.intS.material.emissive.setHex( self.intS.currentHex );
        // }
        
        // If it is the plane then nevermind
        if (intersects[ 0 ].object.name === 'floor') {
          self.intS = null;
          if (self.showAnnotation) {
            // Here we make everything normal again
            // tooltip *
            self.popover.classList.remove('visible')
            self.playAnnotationAnim('backward')
            this.pointerOverWhiteBoard = false
            // Pumpestok
            this.pointerOverPumpeStok = false
            this.groupCoffee.visible = false
          }
          return
        }
        
        // If it is the plane then nevermind
        if (intersects[ 0 ].object.name === 'whiteboard-screen') {
          this.pointerOverWhiteBoard = true
          return
        }
        else {
          this.pointerOverWhiteBoard = false
        }
        
        // If it is the pumpestok-pump
        if (intersects[ 0 ].object.name === 'pumpestok-pump') {
          this.pointerOverPumpeStok = true
          // this.groupCoffee.visible = true
          return
        }
        else {
          this.pointerOverPumpeStok = false
          // this.groupCoffee.visible = false
        }

        self.intS = intersects[ 0 ].object;
        // self.intS.currentHex = self.intS.material.emissive.getHex();
        // self.intS.material.emissive.setHex( 0xffffff ); // Hover / highlight material
        // Store the intersected id
        // self.currentId = self.intS.userData.id
        // self.currentObj = sounds[self.currentId]

        if (self.showAnnotation) {
          // tooltip *
          self.popover.classList.add('visible')
          self.playAnnotationAnim('forward')
        }
        
      }

      self.intersectedObject = self.intS
      // console.log(self.intersectedObject)

      // Change cursor
      document.body.style.cursor = 'pointer'
    }
    else {
      // if ( self.intS ) {
      //   self.intS.material.emissive.setHex( self.intS.currentHex );
      // }
      self.intS = null

      if (self.showAnnotation) {
        // alert('should remove')

        // tooltip *
        self.popover.classList.remove('visible')
        self.playAnnotationAnim('backward')
      }
      
      // Change cursor
      document.body.style.cursor = 'default'
    }
    // loop all meshes
    self.meshes.forEach(element => {
      // if (element != self.intS) {
      //   element.material.emissive.setHex( 0x000000 );
      // }
      // console.log(element.currentHex)
    });
  }

  onMouseDown() {
    this.isMouseDown = true
    if (this.pointerOverPumpeStok) {
      // Play a simple sound once
      // Take a random sound in the coffee sound array
      const randomNumber = Math.floor(Math.random() * 3)
      const randomSoundCoffee = soundspumpeStok[ randomNumber ]
      // console.log('random')
      // console.log(randomNumber)
      const audio = new Audio(`sound/${randomSoundCoffee}`)
		  audio.play()
      this.groupCoffee.visible = true
      gsap.to(this.pumpeStokPump.position, 0.1, {
        x: -0.02
      })
    }
  }
  
  onMouseUp() {
    this.isMouseDown = false
    // Pumpestok actions
    if (this.groupCoffee.visible) {
      gsap.to(this.pumpeStokPump.position, 0.1, {
        x: 0
      })
      this.groupCoffee.visible = false
    }
    // Bring back marker
    // Set position of marker
    gsap.to(this.markerWhiteBoard.position, 0.25, {
      x: this.markerWhiteBoardOrgPos.x,
      y: this.markerWhiteBoardOrgPos.y,
      z: this.markerWhiteBoardOrgPos.z,
    })
  }

  navigationAnimation () {
    let self = this
    this.tlNavigation = new gsap.timeline()
      .to('.anim--nav-tl', stdTime, {y: 0, autoAlpha: 1, ease: Power4.easeInOut}, 0.1, `start+=${stdTime}`)
      // .from('.anim--nav-tr', stdTime, {x: 120, autoAlpha: 0, ease: Power4.easeInOut}, 0.1)
      .to('.anim--nav-br', stdTime, {y: 0, autoAlpha: 1, ease: Power4.easeInOut}, 0.1)
      // .from('.anim--nav-bl', stdTime, {x: -120, autoAlpha: 0, ease: Power4.easeInOut}, 0.1)
      // navigation - end
      // .pause()

    // Prepare video call trigger
    // this.videoTrigger = document.getElementById('triggerVideoCall')
    document.getElementById('triggerVideoCall').addEventListener('click', () => {
      console.log('clicking video call trigger')
      self.turnOnVideoCall()
      // this.set
    })
  }

  initTooltipAnim () {
    var self = this
    self.tlTooltip = new gsap.timeline()
      .to('.info-line', stdTime, {height: '100%', ease: Power3.easeInOut}, 'start')
      // .staggerFrom(".lineChild", 0.75, {y:50}, 0.25)
      .staggerFrom('.anim', stdTime, {y: 20, autoAlpha: 0, ease: Power4.easeInOut}, 0.1, `start+=${stdTime/2}`)
      .pause()
  }

  playAnnotationAnim (kind) {
    var self = this      
    if (kind === 'forward') {
      self.tlTooltip.play()
    }
    else if (kind === 'backward') {
      self.tlTooltip.reverse()
    }      
    // .staggerTo(`#${self.content.id} .anim-selfaware`, 2, {autoAlpha: 1, ease: Sine.easeOut}, 0.25)
  }

  updateScreenPosition() {
    var self = this
    // console.log('update screen position')
    if (self.intersectedObject === null) {
      return
    }
    var mesh = self.intersectedObject
    // var mesh = self.meshes[0];
    const vector = mesh.position.clone()
    const canvas = renderer.domElement
  
    vector.project(camera)
  
    vector.x = Math.round((0.5 + vector.x / 2) * (canvas.width / window.devicePixelRatio))
    vector.y = Math.round((0.5 - vector.y / 2) * (canvas.height / window.devicePixelRatio))
  
    if (self.showAnnotation) {
      // console.log('update screen position')
      // self.annotation.innerHTML = sounds[self.currentId].name;
      // Place little popover
      var popoverAttr = self.popover.getBoundingClientRect()
  
      self.popover.style.top = `${vector.y - (popoverAttr.height / 2)}px`
      self.popover.style.left = `${vector.x - (popoverAttr.width / 2)}px`
    }
  }

  setupTweakGui() {
    var self = this
    /**
     * Base
     */
    // const parameters = {
    //   color: 0xff0000
    // }

    // Portal light material
    this.debugObject.portalColorStart = '#ff0000'
    this.debugObject.portalColorEnd = '#0000ff'

    gui
      .addColor(this.debugObject, 'portalColorStart')
      .onChange(() => {
        this.portalLightMaterial.uniforms.uColorStart.value.set(this.debugObject.portalColorStart)
      })

    gui
      .addColor(this.debugObject, 'portalColorEnd')
      .onChange(() => {
        this.portalLightMaterial.uniforms.uColorEnd.value.set(this.debugObject.portalColorEnd)
      })

    this.portalLightMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uColorStart: { value: new THREE.Color(this.debugObject.portalColorStart) },
        uColorEnd: { value: new THREE.Color(this.debugObject.portalColorEnd) }
      },
      vertexShader: portalVertexShader,
      fragmentShader: portalFragmentShader
    })

  }

  prepareLineGeometry() {
    // geometry
    var lineGeometry = new THREE.BufferGeometry()
    var MAX_POINTS = 5000
    // let linePositions = this.linePositions[this.lineInc]
    this.linePositions = new Float32Array(MAX_POINTS * 3)
    lineGeometry.setAttribute('position', new THREE.BufferAttribute(this.linePositions, 3))

    // material
    var material = new THREE.LineBasicMaterial({
      color: 0xff0000,
      linewidth: 2
    })

    // line
    this.lines[this.lineInc] = new THREE.Line(lineGeometry, material)
    scene.add(this.lines[this.lineInc])
  }

  // update line
  updateLine(pos) {
    // console.log('should draw line')
    let line = this.lines[this.lineInc]
    // let linePositions = this.linePositions[this.lineInc]
    
    this.linePositions[this.count * 3 + 0] = pos.x
    this.linePositions[this.count * 3 + 1] = pos.y
    this.linePositions[this.count * 3 + 2] = pos.z
    this.count++
    line.geometry.setDrawRange(0, this.count)
    line.geometry.attributes.position.needsUpdate = true
  }

}

const setup = new Setup()
