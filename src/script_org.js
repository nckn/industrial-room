import { RectAreaLightUniformsLib } from 'three/examples/jsm/lights/RectAreaLightUniformsLib.js';
// import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

import * as dat from 'dat.gui'
import gsap, { Sine } from 'gsap'

import fragment from './shaders/main/fragment.glsl'
import vertex from './shaders/main/vertex.glsl'

import Normalize from "normalize-wheel";

// Misc helper functions
import {
  checkIfTouch,
  map,
  // createPoints
} from '../static/js/helpers.js'
// import testTexture from '../img/texture.jpg';
// import barba from '@barba/core'

// Texture loader
const textureLoader = new THREE.TextureLoader()

const bakedSpaceTexture = textureLoader.load( './textures/baked_konradstudio-website-space-2_main.jpg' )
bakedSpaceTexture.flipY = false
bakedSpaceTexture.encoding = THREE.sRGBEncoding
// Floor specific material
const bakedSpaceMaterialFloor = new THREE.MeshStandardMaterial({
  map: bakedSpaceTexture,
  // alphaMap: bakedFloorTextureAlphaMap,
  // aoMapIntensity: 0.2,
  // transparent: true
})

export default class Sketch {
  constructor (options) {
    this.container = options.domElement
    this.width = this.container.offsetWidth
    this.height = this.container.offsetHeight

    this.imagesAdded = 0

    this.frustumSize = 10

    // #camerapos
    this.cam = {
      // 0, 20, 0 is top
      pos: {
        startX: 0, // 20
        startY: 1,
        startZ: 20, // 20, 
      }
    }

    this.rotSpeed = .00

    this.scroll = {
      clamp: {
        minimum: 0,
        maximum: 0
      },
      values: {
        current: 0,
        target: 0
      },
      y: {
        end: 0,
        start: 0
      }
    }

    this.isFocus = false

    // cam-pos
    this.debuggerCamPos = document.querySelector('.debugger-cam-pos')
    // groupCam-pos
    this.debuggerGroupCamPos = document.querySelector('.debugger-group-cam-pos')
    // cam-rot
    this.debuggerCamRot = document.querySelector('.debugger-cam-rot')
    // groupCam-rot
    this.debuggerGroupCamRot = document.querySelector('.debugger-group-cam-rot')

    this.canvasContainer = document.querySelector('#container')
    this.asscroContainer = document.querySelector('div[asscroll-container]')

    // Camera related
    // this.isPerspective = false
    this.isPerspective = true
    // For debug if ned to orbit
    this.isControlsEnabled = false
    // this.isControlsEnabled = true

    this.isActiveASScroll = true
    // this.isActiveASScroll = false

    this.scene = new THREE.Scene()

    // GLTF loader
    this.gltfLoader = new GLTFLoader()
    this.meshes = []

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true
    })
    this.renderer.setPixelRatio(window.devicePixelRatio)
    // this.renderer.setPixelRatio(2);
    this.container.appendChild(this.renderer.domElement)
    // this.controls = new OrbitControls(this.camera, this.renderer.domElement)
    this.materials = []

    if (this.isActiveASScroll) {
      this.asscroll = new ASScroll({
        disableRaf: true
      })
  
      this.asscroll.enable()

      // this.asscroll.enable({
      //   // horizontalScroll: true
      //   // horizontalScroll: !document.body.classList.contains('b-inside')
      // })
    }
    this.time = 0

    this.sphere = null
    this.satellite = null
    this.speedFactor = 0
    this.normalized = 0
    this.speed = 0
    // this.setupSettings()

    this.setupCamera()

    // Make THREE clock
    this.clock = new THREE.Clock()
    
    // Load the scene
    this.loadScene()
    
    this.addObjects()
    this.addClickEvents()
    this.onResize()
    
    this.setOrbitControls()
    
    // All timeline setup
    this.timelineSetup()

    this.render()

    this.setupResize()
    
    // this.addAxesHelper()

    // this.addFloor()
    this.addLights()

    this.setupKeyPresses()

    this.updateDebugger()

    this.addEventListeners()
    
    this.makeSatellite()

  }

  makeSatellite() {
    let self = this
    // sphere
    const geometry = new THREE.SphereGeometry( 1, 32, 32 );
    const material = new THREE.MeshPhongMaterial( { color: 0xffffff, flatShading: false } );
    self.sphere = new THREE.Mesh( geometry, material );
    self.scene.add( self.sphere );

    self.group = new THREE.Group()
            
            //satelite
    const geometry_satelite = new THREE.BoxGeometry( 0.4, 0.4, 0.4 );
    const material_satelite = new THREE.MeshNormalMaterial( {  flatShading: true } );
    self.satellite = new THREE.Mesh( geometry_satelite, material_satelite );
    self.satellite.position.x = 5
    self.group.add( self.satellite );
    self.scene.add( self.group );
  }

  addEventListeners() {
    let self = this
    window.addEventListener("mousewheel", this.onWheel.bind(self), false);
    window.addEventListener("wheel", this.onWheel.bind(self), false);

    window.addEventListener('click', self.pointerEventHappens.bind(this), false)

    // window.addEventListener("mousedown", this.onTouchDown, false);
    // window.addEventListener("mousemove", this.onTouchMove, false);
    // window.addEventListener("mouseup", this.onTouchUp, false);
    
    // window.addEventListener("touchstart", this.onTouchDown, false);
    // window.addEventListener("touchmove", this.onTouchMove, false);
    // window.addEventListener("touchend", this.onTouchUp, false);
    
    // On simple hover
    // window.addEventListener("mousemove", this.onTouchDown.bind(this));
  }

  timelineSetup() {
    this.timelineSetupCamDown()
  }

  addLights() {
    // Ambient light
    const light = new THREE.AmbientLight( 0x909090 ) // soft white light
    this.scene.add( light )
    
    // Directional light
    this.directionalLight = new THREE.DirectionalLight(0xffffff, 0.75)
    this.directionalLight.position.set(0, 8, 0)
    this.scene.add(this.directionalLight)
  }

  addFloor() {
    const geometry = new THREE.PlaneGeometry( 10, 10, 20, 20 )
    const material = new THREE.MeshBasicMaterial( {color: 0xff0000, side: THREE.DoubleSide, wireframe: true } )
    const plane = new THREE.Mesh( geometry, material )
    plane.rotation.x = Math.PI / 2
    this.scene.add( plane )
  }

  addAxesHelper() {
    const axesHelper = new THREE.AxesHelper( 5 );
    this.scene.add( axesHelper )
  }

  setupCamera() {
    this.camPosX = 10
    if (this.isPerspective) {
      // Base camera - perspective
      this.camera = new THREE.PerspectiveCamera(30, this.width / this.height, 0.01, 1000)
    }
    else {
      // Base camera - orthographic
      this.camera = new THREE.OrthographicCamera( this.width / - this.frustumSize, this.width / this.frustumSize, this.height / this.frustumSize, this.height / - this.frustumSize, 0.01, 1000 )
    }
    
    // this.camera.position.x = this.camPosX
    
    // var vector = new THREE.Vector3( 0, 0, - 1 )
  
    // #camerapos
    this.camera.position.x = this.cam.pos.startX
    this.camera.position.y = this.cam.pos.startY
    this.camera.position.z = this.cam.pos.startZ
    
    // this.camera.rotation.set( Math.PI / 2, 0, 0 )

    // this.camera.up.set(0, 1, 0)
    // this.camera.up.set(0, 0, -1)
    // this.camera.rotation.set(Math.PI / -2, 0, 0)
    // this.camera.lookAt( 0, this.camera.position.y, 0 )

    // this.camera.fov = (2 * Math.atan(this.height / 2 / this.camPosX) * 180) / Math.PI
    
    // camera group
    this.groupCamera = new THREE.Group()
    this.groupCamera.add( this.camera )
    // this.groupCamera.position.y = 20

    // scene.add(camera)
    this.scene.add(this.groupCamera)
  }

  setPosition () {
    let self = this
    // console.log('setPosition')
    // console.log('this.asscroll')
    // console.log(this.asscroll)
    // console.log('this.asscroll.currentPos')
    // console.log(this.asscroll.currentPos)

    // const mappedPosZ = map(this.asscroll.currentPos, 0, 2000, -2, 2)
    // const mappedPosZ = map(this.asscroll.currentPos, 0, 2000, 0.1, 10)
    // self.rotSpeed = map(this.asscroll.currentPos, 0, 5400, -0.001, 0.001)

    // This move the groupScene
    // console.log(this.groupScene)
    
    // if (this.groupScene === undefined)
    //   return

    // this.groupScene.position.y = -this.asscroll.currentPos
    // this.groupCamera.position.z = this.asscroll.currentPos
    // this.groupCamera.position.z = mappedPosZ
    
    // gsap.to(this.camera.position, 1, {
    // gsap.to(this.groupCamera.position, 0.1, {
    //   z: mappedPosZ
    //   // x: mappedPosZ,
    //   // y: mappedPosZ
    //   // z: this.asscroll.currentPos
    // })

    // Moving images
    // if (!this.animationRunning) {
    //   this.imageStore.forEach(o => {
    //     o.mesh.position.x =
    //       -this.asscroll.currentPos + o.left - this.width / 2 + o.width / 2
    //     o.mesh.position.y = -o.top + this.height / 2 - o.height / 2
    //   })
    // }
  }

  timelineSetupCamDown() {
    this.tlCamDown = gsap.timeline()
    this.tlCamDown
      .to(this.camera.position, 2.5, { y: 1, ease: 'expo.InOut' })
      .to(this.camera.rotation, 2.5, { z: Math.PI / 2, y: Math.PI / 2, ease: 'expo.InOut' })
      .pause()
  }

  addClickEvents () {
    var self = this

    // window.addEventListener('pointermove', self.pointerEventHappens.bind(this), false)

    this.imageStore.forEach(i => {
      i.img.addEventListener('click', () => {
        let tl = gsap
          .timeline()
          .to(i.mesh.material.uniforms.uCorners.value, {
            x: 1,
            duration: 0.4
          })
          .to(
            i.mesh.material.uniforms.uCorners.value,
            {
              y: 1,
              duration: 0.4
            },
            0.1
          )
          .to(
            i.mesh.material.uniforms.uCorners.value,
            {
              z: 1,
              duration: 0.4
            },
            0.2
          )
          .to(
            i.mesh.material.uniforms.uCorners.value,
            {
              w: 1,
              duration: 0.4
            },
            0.3
          )
      })
    })
  }

  modifyObject(obj) {
    var self = this
    if (obj.name === 'Cube') {
      // Create an array of materials to be used in a cube, one for each side
      // var cubeMaterialArray = [];
      // // order to add materials: x+,x-,y+,y-,z+,z-
      // cubeMaterialArray.push( new THREE.MeshBasicMaterial( { color: 0xff3333 } ) );
      // cubeMaterialArray.push( new THREE.MeshBasicMaterial( { color: 0xff8800 } ) );
      // cubeMaterialArray.push( new THREE.MeshBasicMaterial( { color: 0xffff33 } ) );
      // cubeMaterialArray.push( new THREE.MeshBasicMaterial( { color: 0x33ff33 } ) );
      // cubeMaterialArray.push( new THREE.MeshBasicMaterial( { color: 0x3333ff } ) );
      // cubeMaterialArray.push( new THREE.MeshBasicMaterial( { color: 0x8833ff } ) );
      // var cubeMaterials = new THREE.MeshFaceMaterial( cubeMaterialArray );
      // Cube parameters: width (x), height (y), depth (z), 
      //        (optional) segments along x, segments along y, segments along z
      // var cubeGeometry = new THREE.CubeGeometry( 100, 100, 100, 1, 1, 1 );
      // using THREE.MeshFaceMaterial() in the constructor below
      //   causes the mesh to use the materials stored in the geometry

      const materials = [
        new THREE.MeshBasicMaterial({
          map: textureLoader.load("./textures/projects/project-thumb-tsw.jpg")
        }),
        new THREE.MeshBasicMaterial({
          map: textureLoader.load("./textures/projects/project-thumb-lagoon.jpg")
        }),
        new THREE.MeshBasicMaterial({
          map: textureLoader.load("./textures/projects/project-thumb-white.jpg") // top
        }),
        new THREE.MeshBasicMaterial({
          map: textureLoader.load("./textures/projects/project-thumb-tsw.jpg")
        }),
        new THREE.MeshBasicMaterial({
          map: textureLoader.load("./textures/projects/project-thumb-soundescapes.jpg")
        }),
        new THREE.MeshBasicMaterial({
          map: textureLoader.load("./textures/projects/project-thumb-3dtype.jpg")
        }),
      ];

      //satelite
      const geometry_satelite = new THREE.BoxGeometry( 2, 2, 2 );
      // const material_satelite = new THREE.MeshNormalMaterial( {  flatShading: true } );
      const satellite = new THREE.Mesh( geometry_satelite, materials );
      satellite.position.z = 0
      satellite.position.y = 1
      // self.satellite.position.copy(obj.position)
      self.scene.add( satellite );
      // self.scene.add( self.group );
    
      materials.forEach((_, index) => {
        materials[index].side = THREE.DoubleSide;
      });

      console.log('should apply')
      console.log(obj)
      
      obj.visible = false
      // obj.material = materials

      // cube = new THREE.Mesh( cubeGeometry, cubeMaterials );
      // cube.position.set(-100, 50, -50);
    }
  }

  loadScene() {
    var self = this
    /**
     * Model
     */
    this.gltfLoader.load(
      // 'models/typography-in-3d_1a.glb', // Mine from landscape-playground.blend
      // 'models/typography-in-3d_1b.glb', // Mine from landscape-playground.blend
      'models/konradstudio-website-space-2.glb', //

      (gltf) => {
        // Traverse scene if wanting to look for things and names
        gltf.scene.traverse( child => {
          
          // Log the object / mesh name
          console.log(child.name)

          // child.material = bakedMaterial
          // Add each child to the meshes array
          this.meshes.push(child)
          // Assign ID to mesh
          child.userData.id = 0

          // First hide all the objects we do not want to see 
          // child.name === 'Floor' ||
          if (
            child.name === 'Cube'
          ) {
            child.material = bakedSpaceMaterialFloor
          }

          // Scale the floor. Should not as the baked texture would not look nice
          if (child.name === 'Cube') {
            self.modifyObject( child )
          }

          if (child.material) {
            child.material.flatShading = false
          }
          
        })

        // lightBoxLarge.visible = false
        // boxLightLarge.visible = false

        this.groupScene = new THREE.Group()
        this.groupScene.add(gltf.scene)
        this.scene.add(this.groupScene)

      }
    )
  }

  setupKeyPresses() {
    var self = this
    // var { camera } = this.state
    document.addEventListener('keyup', (e) => {
      // console.log('yes: ', e)
      if (e.code === 'KeyR') {
        // console.log(camera)
        gsap.to(this.camera.position, 1, {x: 0.0, y: self.cam.pos.startY, z: 0.04})
        gsap.to(this.groupCamera.position, 1, {x: 0.0, y: 0.0, z: 0.0})
        
        this.controls.reset()
        // gsap.to(this.camera.rotation, 1, {x: 0, y: 0, z: 0})
        // this.camera.updateMatrix()
        // gsap.to(this.groupCamera.rotation, 1, {x: 0, y: 0, z: 0})
        // this.groupCamera.updateMatrix()

        // gsap.to(this.groupCamera.position, 1.4, {x: 0.0, y: 4, z: 0.02, ease: Sine.ease})
      }
      // If letter o
      if (e.key === 'o') {
        console.log('o was pressed')
        
        // this.renderer.render(this.scene, this.camera)
        
        // this.controls.enabled = true
        this.controls.enabled = !this.controls.enabled
        this.controls.update()

        // Set target of controls
        let gCPos = this.groupCamera.position
        this.controls.target = new THREE.Vector3(gCPos.x, gCPos.y, gCPos.z)
        // gsap.to(self.controls.target, 1, {x: gCPos.x, y: gCPos.y, z: gCPos.z})
        // self.controls.target.set(new THREE.Vector3(gCPos.x, gCPos.y, gCPos.z))
        // this.controls.target.set(new THREE.Vector3(gCPos.x, gCPos.y, gCPos.z))
        // this.controls.target.set(this.groupCamera.position)

        // self.isControlsEnabled = !self.isControlsEnabled
        self.isActiveASScroll = !self.isActiveASScroll

        this.canvasContainer.classList.toggle('container--enabled')
        this.asscroContainer.classList.toggle('asscroll-container--disabled')

        // console.log('controls: ', this.controls.enabled)
        // console.log('isActiveASScroll: ', this.isActiveASScroll)
      }
      // Setup keyboard keys as keys
      // this.playKey({keyCode: e.code})
      // if (e.code === 'KeyA') {
      // }
    })
  }

  setupSettings () {
    this.settings = {
      progress: 0
    }
    this.gui = new dat.GUI()
    this.gui.add(this.settings, 'progress', 0, 1, 0.001)
  }

  tweenObject(object, kind) {
    console.log('object')
    console.log(object)
    var randomNumber = ( Math.random() - 0 ) * 10
    console.log(randomNumber)
    // Scale
    if (kind === 'scale') {
      gsap.to(object.scale, 0.5, {
        y: randomNumber
      })
    }
    // title_POWER
    if (kind === 'move camdown') {
      this.tlCamDown.play()
    }
    // graph1_c
    if (kind === 'move cam-reset') {
      this.tlCamDown.reverse()
      // gsap.to(object.position, 0.5, { y: this.cam.pos.startY })
      // gsap.to(this.camera.position, 1, {x: 0.0, y: self.cam.pos.startY, z: 0.04})
      // gsap.to(this.groupCamera.position, 1, {x: 0.0, y: 0.0, z: 0.0})
      
      // this.controls.reset()
      
      gsap.to(object.rotation, 2.5, { z: 0, y: 0 })
      // gsap.to(object.rotation, 2.5, { z: Math.PI * 1.5, y: Math.PI * 1.5 })
      // gsap.to(object.rotation, 2.5, { z: Math.PI / 2, y: Math.PI / 2 })
    }
  }

  // Function that returns a raycaster to use to find intersecting objects
  // in a scene given screen pos and a camera, and a projector
  getRayCasterFromScreenCoord (screenX, screenY, camera) {
    var self = this
    var raycaster = new THREE.Raycaster()
    var mouse3D = new THREE.Vector3()
    // Get 3D point form the client x y
    mouse3D.x = (screenX / window.innerWidth) * 2 - 1
    mouse3D.y = -(screenY / window.innerHeight) * 2 + 1
    mouse3D.z = 0.5
    raycaster.setFromCamera(mouse3D, camera)
    return raycaster
  }

  // Add event listener
  pointerEventHappens(e) {
    var self = this
    var mouseCoords = checkIfTouch(e)
    if (self.gplane && self.mouseConstraint) {
      var pos = self.projectOntoPlane(mouseCoords.x, mouseCoords.y, self.gplane, self.camera)
      if (pos) {
        var yDiff = self.mouseDownPos.y - pos.y
        self.setClickMarker(pos.x - yDiff**2, pos.y, pos.z, self.scene)
        self.moveJointToPoint(pos.x - yDiff**2, pos.y, pos.z)
      }
    }
    // return
    var mouseCoords = checkIfTouch(e)
    this.raycaster = self.getRayCasterFromScreenCoord(mouseCoords.x, mouseCoords.y, self.camera)
    // Find the closest intersecting object
    // Now, cast the ray all render objects in the scene to see if they collide. Take the closest one.
    var intersects = this.raycaster.intersectObjects(self.meshes);
    
    // Intersected object
    self.intS = self.INTERSECTED
    // self.intersectedObject = self.INTERSECTED // Because intS follows specific hover rules

    // Update particles
    // this.updateParticles()

    // This is where an intersection is detected
    if ( intersects.length > 0 ) {
      if ( self.intS != intersects[ 0 ].object ) {

        // Log raycast hits
        console.log('there is a hit')
        console.log(intersects[ 0 ].object.name)

        // #focusproject #tweenproject #tweenanimatin
        // Focus on this project
        if (this.isFocus) {
          // this.tweenObject(this.groupCamera, 'move cam-reset')
          // gsap.to(self.groupCamera.position, 1.5, { x: 0, z: 0, y: 0 })
          // gsap.to(self.camera.position, 1.5, { x: 0, z: 0, y: 0 })
          // this.controls.target = new THREE.Vector3(0, 4, 0)
          self.isFocus = false
        }
        else {
          // gsap.to(self.groupCamera.position, 1.5, {
          // gsap.to(self.camera.position, 1.5, {
          //   x: this.cam.pos.startX,
          //   z: this.cam.pos.startY,
          //   y: this.cam.pos.startZ
          // })
          self.isFocus = true
        }

        // title_POWER
        if (intersects[0].object.name === 'title_POWER') {
          this.tweenObject(this.camera, 'move camdown')
        }
        // graph1_c
        if (intersects[0].object.name === 'graph1_c') {
          this.tweenObject(this.camera, 'move cam-reset')
        }
        //

        // Tween the raycast hit object
        // self.tweenObject(intersects[ 0 ].object, 'scale')

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
        
        // // If it is the plane then nevermind
        // if (intersects[ 0 ].object.name === 'whiteboard-screen') {
        //   this.pointerOverWhiteBoard = true
        //   return
        // }
        // else {
        //   this.pointerOverWhiteBoard = false
        // }

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

  onResize () {
    this.width = this.container.offsetWidth
    this.height = this.container.offsetHeight

    if (this.isPerspective) {
      // Perspective
      this.camera.aspect = this.width / this.height
    }
    else {
      // Orthographic
      const aspect = this.width / this.height
      this.camera.left = this.frustumSize * aspect / - 2;
      this.camera.right = this.frustumSize * aspect / 2;
      this.camera.top = this.frustumSize / 2;
      this.camera.bottom = - this.frustumSize / 2;
    }

    this.camera.updateProjectionMatrix()
    this.renderer.setSize(this.width, this.height)

    // this.camera.fov = (2 * Math.atan(this.height / 2 / (this.camPosX / 2)) * 180) / Math.PI

    this.materials.forEach(m => {
      m.uniforms.uResolution.value.x = this.width
      m.uniforms.uResolution.value.y = this.height
    })

    if (!this.isActiveASScroll)
      return

    this.imageStore.forEach(i => {
      let bounds = i.img.getBoundingClientRect()
      i.mesh.scale.set(bounds.width, bounds.height, 1)
      i.top = bounds.top
      i.left = bounds.left + this.asscroll.currentPos
      i.width = bounds.width
      i.height = bounds.height

      i.mesh.material.uniforms.uQuadSize.value.x = bounds.width
      i.mesh.material.uniforms.uQuadSize.value.y = bounds.height

      i.mesh.material.uniforms.uTextureSize.value.x = bounds.width
      i.mesh.material.uniforms.uTextureSize.value.y = bounds.height
    })
  }

  setupResize () {
    window.addEventListener('resize', this.onResize.bind(this))
  }

  addObjects () {
    this.geometry = new THREE.PlaneBufferGeometry(1, 1, 100, 100)
    console.log(this.geometry)
    this.material = new THREE.ShaderMaterial({
      // wireframe: true,
      uniforms: {
        time: { value: 1.0 },
        uProgress: { value: 0 },
        uTexture: { value: null },
        uTextureSize: { value: new THREE.Vector2(100, 100) },
        uCorners: { value: new THREE.Vector4(0, 0, 0, 0) },
        uResolution: { value: new THREE.Vector2(this.width, this.height) },
        uQuadSize: { value: new THREE.Vector2(this.camPosX / 2, this.camPosX / 2) }
      },
      vertexShader: vertex,
      fragmentShader: fragment
    })

    this.mesh = new THREE.Mesh(this.geometry, this.material)
    this.mesh.scale.set(this.camPosX / 2, this.camPosX / 2, 1)
    // this.scene.add( this.mesh );
    this.mesh.position.x = this.camPosX / 2

    this.images = [...document.querySelectorAll('.js-image')]

    this.imageStore = this.images.map(img => {
      let bounds = img.getBoundingClientRect()
      let m = this.material.clone()
      this.materials.push(m)
      let texture = new THREE.Texture(img)
      texture.needsUpdate = true

      m.uniforms.uTexture.value = texture

      // img.addEventListener('mouseout',()=>{
      //     this.tl = gsap.timeline()
      //     .to(m.uniforms.uCorners.value,{
      //         x:0,
      //         duration: 0.4
      //     })
      //     .to(m.uniforms.uCorners.value,{
      //         y:0,
      //         duration: 0.4
      //     },0.1)
      //     .to(m.uniforms.uCorners.value,{
      //         z:0,
      //         duration: 0.4
      //     },0.2)
      //     .to(m.uniforms.uCorners.value,{
      //         w:0,
      //         duration: 0.4
      //     },0.3)
      // })

      let mesh = new THREE.Mesh(this.geometry, m)
      mesh.visible = false
      this.scene.add(mesh)
      mesh.scale.set(bounds.width, bounds.height, 1)
      return {
        img: img,
        mesh: mesh,
        width: bounds.width,
        height: bounds.height,
        top: bounds.top,
        left: bounds.left
      }
    })
  }

  updateDebugger() {
    const cP = this.camera.position
    const gGP = this.groupCamera.position
    const cR = this.camera.rotation
    const gGR = this.groupCamera.rotation
    this.debuggerCamPos.innerHTML = `<span>x: ${ cP.x.toFixed(2) }</span> <span>y: ${ cP.y.toFixed(2) }</span> <span>z: ${ cP.z.toFixed(2) }</span>`
    this.debuggerGroupCamPos.innerHTML = `<span>x: ${ gGP.x.toFixed(2) }</span> <span>y: ${ gGP.y.toFixed(2) }</span> <span>z: ${ gGP.z.toFixed(2) }</span>`
    this.debuggerCamRot.innerHTML = `<span>x: ${ cR.x.toFixed(2) }</span> <span>y: ${ cR.y.toFixed(2) }</span> <span>z: ${ cR.z.toFixed(2) }</span>`
    this.debuggerGroupCamRot.innerHTML = `<span>x: ${ gGR.x.toFixed(2) }</span> <span>y: ${ gGR.y.toFixed(2) }</span> <span>z: ${ gGR.z.toFixed(2) }</span>`
  }

  updateRotation(){
    let self = this
    // self.rotSpeed = .001
    var x = this.camera.position.x,
      y = this.camera.position.y,
      z = this.camera.position.z;

    this.camera.position.x = x * Math.cos(self.rotSpeed) + z * Math.sin(self.rotSpeed);
    this.camera.position.z = z * Math.cos(self.rotSpeed) - x * Math.sin(self.rotSpeed); 

    this.camera.lookAt(new THREE.Vector3(0,0,0));

    // console.log('this.camera.position.x')
    // console.log(this.camera.position.x)
    // console.log('rotSpeed')
    // console.log(this.rotSpeed)
  }

  onWheel(event) {
    var self = this
    self.normalized = Normalize(event);
    self.speed = self.normalized.pixelY * 0.2;
    self.scroll.values.target += self.speed;

    // console.log('onWheel')
    // console.log('normalized')
    // console.log(normalized)
    // console.log(normalized.spinY)
    
    // The swipe. Set the progress value
    self.progressVal = self.scroll.values.target < 0 ? 0 : this.scroll.values.target
    // self.normProgressVal = map(self.progressVal, 0, 200, 0, 1)
    self.normProgressVal = map(self.progressVal, 0, 200, -1, 1)
    // console.log('self.progressVal')
    // console.log(self.progressVal)
    // console.log('self.normProgressVal')
    // console.log(self.normProgressVal)

    var x = this.camera.position.x,
      y = this.camera.position.y,
      z = this.camera.position.z;

    // const scaledValue = self.normProgressVal * 0.001
    // self.rotSpeed = self.normProgressVal * 0.001
    
    // self.rotSpeed = self.normalized.spinY * 1
    self.rotSpeed = self.normalized.spinY * 0.005
    
    // console.log('self.rotSpeed')
    // console.log(self.rotSpeed)

    // this.camera.position.x = x * Math.cos(scaledValue) + z * Math.sin(scaledValue);
    // this.camera.position.z = z * Math.cos(scaledValue) - x * Math.sin(scaledValue);
    // this.camera.position.x = x * Math.cos(self.rotSpeed) + z * Math.sin(self.rotSpeed);
    // this.camera.position.z = z * Math.cos(self.rotSpeed) - x * Math.sin(self.rotSpeed);

    // self.rotSpeed = normProgressVal * 0.01
    // self.tl.progress(self.normProgressVal)
  }

  updateRotationOfCamera() {
    //time tracking
    let self = this
    var delta = self.clock.getDelta();
    var elapsed = self.clock.elapsedTime;
    
    //sphere position
    // sphere.position.x = Math.sin(elapsed/2) * 3;
    // sphere.position.z = Math.cos(elapsed/2) * 3;
    if (self.satellite === null)
     return
    
    // self.speedFactor *= self.rotSpeed
    self.speedFactor += self.rotSpeed
    console.log(self.speedFactor)

    // self.speedFactor = map(self.speedFactor, 0, 200, -1, 1)
    // self.speedFactor = self.normalized.spinY

    // if (self.rotSpeed < 0) {
    //   self.speedFactor *= -1 
    // }
    // else {
    //   self.speedFactor = Math.abs(self.speedFactor)
    // }

    //camera
    self.controls.update()
    // self.camera.position.x = self.sphere.position.x + Math.sin(elapsed * self.speedFactor) * 4;
    // self.camera.position.z = self.sphere.position.z + Math.cos(elapsed * self.speedFactor) * 4;
    


    // self.camera.position.x = self.sphere.position.x + Math.sin(elapsed * (self.normalized.spinY * 0.01)) * 4;
    // self.camera.position.z = self.sphere.position.z + Math.cos(elapsed * (self.normalized.spinY * 0.01)) * 4;
    
    this.groupCamera.rotation.y += self.rotSpeed
    this.camera.lookAt(new THREE.Vector3(0,0,0));

    // //satellite
    // self.satellite.position.x = self.sphere.position.x + Math.sin(elapsed * self.speedFactor) * 4;
    // self.satellite.position.z = self.sphere.position.z + Math.cos(elapsed * self.speedFactor) * 4;

    self.satellite.lookAt(self.sphere.position)

    // Since spinY is has a minimum of 0.05 do a neat little thing and force it to
    // zero if that is where we are - at the end of a mouse wheel event.
    self.rotSpeed = Math.abs(self.rotSpeed) <= 0.05 ? 0 : self.rotSpeed
    
    // self.group.rotation.x += 0.4 * delta;
    self.group.rotation.y -= (self.rotSpeed * 2);

    // console.log(self.normalized.spinY)
    // self.satellite.rotation.x += 0.4 * delta;
    // self.satellite.rotation.y += 0.2 * delta;
  }

  render () {
    this.time += 0.05
    this.material.uniforms.time.value = this.time

    this.updateDebugger()

    // this.updateRotation()
    this.updateRotationOfCamera()

    // console.log('camera pos y')
    // console.log(this.groupCamera.position)

    // this.camera.lookAt( 0, 0, this.camera.position.z )
    // this.camera.getWorldDirection( 0, 0, this.camera.position.z )

    // if (!this.isControlsEnabled && this.isActiveASScroll) {
    if (!this.controls.enabled && this.isActiveASScroll) {
      // console.log('should not update controls')
      this.asscroll.update()
      this.setPosition()
    }
    // else {
    //   console.log('should update controls')
    //   this.controls.update()
    // }

    // console.log('controls: ', this.isControlsEnabled)
    // console.log('isActiveASScroll: ', this.isActiveASScroll)

    // if (this.isControlsEnabled) {
      
    // if (this.isControlsEnabled && !this.isActiveASScroll) {
    // this.controls.update()
    if (this.controls.enabled && !this.isActiveASScroll) {
      // console.log('should update controls')
      this.controls.update()
    }

    this.renderer.render(this.scene, this.camera)
    requestAnimationFrame(this.render.bind(this))
  }

  setOrbitControls() {
    // Controls
    this.controls = new OrbitControls(this.camera, this.renderer.domElement)
    this.controls.enableDamping = true
    this.controls.enablePan = false
    // Set max polar angle
    this.controls.maxPolarAngle = (Math.PI * 0.5) * 0.99 // Allow to go to floor level
    // this.controls.maxPolarAngle = (Math.PI * 0.45) * 0.99
    // this.controls.minDistance = 12
    // this.controls.maxDistance = 20
    this.controls.addEventListener('change', _ => {
      // console.log('camera distance: ', this.camera.position)
    })
    this.controls.enabled = false
  }
}

new Sketch({
  domElement: document.getElementById('container')
})
