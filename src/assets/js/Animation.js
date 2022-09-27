import * as THREE from 'three'

class AnimatedChar {
  constructor ({ scene, camera, loader, modelPath, modelTexturePath, charName, customMaterial }) {
    // Set our main variables
    this.scene = scene
    this.camera = camera
    this.loader = loader
    this.modelPath = modelPath
    this.modelTexturePath = modelTexturePath
    this.charName = charName
    this.customMaterial = customMaterial
    
    this.modelTexture = null
    this.model = null
    this.neck = null
    this.waist = null
    this.possibleAnims = null
    this.mixer = null
    this.idle = null
    this.clock = new THREE.Clock()
    this.currentlyAnimating = false
    this.raycaster = new THREE.Raycaster()
    this.loaderAnim = document.getElementById('js-loader')

    this.textureLoader = new THREE.TextureLoader()

    // console.log('here the scene: ', scene)
    // console.log('loader: ', this.loader)

    // console.log('received material')
    // console.log(this.customMaterial)

    // return
    this.init()

    this.setupEventListeners()
  }

  init () {
    var self = this

    // if (this.modelTexturePath !== '') {
    //   this.modelTexture = new THREE.TextureLoader().load(
    //     self.modelTexturePath
    //   )
    //   this.modelTexture.flipY = false
    // }

    // const stacy_mtl = new THREE.MeshPhongMaterial({
    //   color: 0xffffff,
    //   skinning: true
    // })

    // if (this.modelTexturePath !== '') {
    //   stacy_mtl.map = self.modelTexture
    // }

    self.loader.load(
      self.modelPath,
      gltf => {
        self.model = gltf.scene
        let fileAnimations = gltf.animations

        self.model.traverse(o => {
          // console.log(o.name)
          if (o.isMesh) {
            o.castShadow = true
            o.receiveShadow = true
            // o.material = stacy_mtl
          }
          // Reference the neck and waist bones
          if (o.isBone && o.name === 'mixamorigNeck') {
            this.neck = o
          }
          if (o.isBone && o.name === 'mixamorigSpine') {
            this.waist = o
          }

          // The whiteboard can be drawn upon
          if (o.name === 'body_upper_Vert017') {
            // o.visible = false
            // o.material = this.customMaterial
            // console.log(this.whiteBoard.position)
          }

          // self.upperBodyMesh = gltf.scene.children.find(
        //   child => child.name === 'body_upper_Vert017'
        // )
        // self.upperBodyMesh.material = self.portalLightMaterial
          
          // Check if body_upper
          // if (o.name === 'body_upper_Vert017') {
          //   const modelTexture = new THREE.TextureLoader().load(
          //     'textures/tattoos-skin-color-pink.png'
          //   )
          //   modelTexture.flipY = false
          //   const materialTattoo = new THREE.MeshPhongMaterial({ 
          //     map: modelTexture,
          //     // color: 0x290000,
          //     skinning: true
          //   })
          //   o.material = materialTattoo
          // }
        })

        if (this.charName === 'stacey') {
          self.model.scale.set(0.05, 0.05, 0.05)
          self.model.position.x = 3
          // console.log('charName is stacey')
        }
        else if (this.charName === 'daniel') {
          self.model.scale.set(100, 100, 100)
          self.model.position.y -= 0.1
        }

        this.scene.add(self.model)

        // this.loaderAnim.remove()

        this.mixer = new THREE.AnimationMixer(self.model)

        let clips = fileAnimations.filter(val => val.name !== 'idle')
        self.possibleAnims = clips.map(val => {
          
          // console.log(this.charName)
          // console.log(val)

          let clip = THREE.AnimationClip.findByName(clips, val.name)

          clip.tracks.splice(3, 3)
          clip.tracks.splice(9, 3)

          clip = this.mixer.clipAction(clip)
          return clip
        })

        console.log('animations')
        console.log(fileAnimations[0].duration)

        // return
        // let idleAnim = null
        // let animName = null
        
        // idleAnim = THREE.AnimationClip.findByName(
        //   fileAnimations,
        //   animName
        // )
        let idleAnim = THREE.AnimationClip.findByName(
          fileAnimations,
          'idle'
        )
        
        // Have control over waist and neck of Stacey
        idleAnim.tracks.splice(3, 3)
        idleAnim.tracks.splice(9, 3)

        this.idle = this.mixer.clipAction(idleAnim)
        this.idle.play()

        // Start the update of frames
        // this.update()
      },
      undefined, // We don't need this function
      function (error) {
        console.error(error)
      }
    ) 

    // Add lights
    // let hemiLight = new THREE.HemisphereLight(0xffffff, 0xffffff, 0.61)
    // hemiLight.position.set(0, 50, 0)
    // // Add hemisphere light to scene
    // scene.add(hemiLight)

    // let d = 8.25
    // let dirLight = new THREE.DirectionalLight(0xffffff, 0.54)
    // dirLight.position.set(-8, 12, 8)
    // dirLight.castShadow = true
    // dirLight.shadow.mapSize = new THREE.Vector2(1024, 1024)
    // dirLight.shadow.camera.near = 0.1
    // dirLight.shadow.camera.far = 1500
    // dirLight.shadow.camera.left = d * -1
    // dirLight.shadow.camera.right = d
    // dirLight.shadow.camera.top = d
    // dirLight.shadow.camera.bottom = d * -1
    // // Add directional Light to scene
    // this.scene.add(dirLight)

    // Floor
    // let floorGeometry = new THREE.PlaneGeometry(5000, 5000, 1, 1)
    // let floorMaterial = new THREE.MeshPhongMaterial({
    //   color: 0xeeeeee,
    //   shininess: 0
    // })

    // let floor = new THREE.Mesh(floorGeometry, floorMaterial)
    // floor.rotation.x = -0.5 * Math.PI
    // floor.receiveShadow = true
    // floor.position.y = -11
    // this.scene.add(floor)

    // let geometry = new THREE.SphereGeometry(8, 32, 32)
    // let material = new THREE.MeshBasicMaterial({ color: 0x9bffaf }) // 0xf2ce2e
    // let sphere = new THREE.Mesh(geometry, material)

    // sphere.position.z = -15
    // sphere.position.y = -2.5
    // sphere.position.x = -0.25
    // this.scene.add(sphere)
  }

  update () {
    let self = this
    if (self.mixer) {
      self.mixer.update(this.clock.getDelta())
    }

    // console.log('updating')

    // if (resizeRendererToDisplaySize(renderer)) {
    //   const canvas = renderer.domElement
    //   this.camera.aspect = canvas.clientWidth / canvas.clientHeight
    //   this.camera.updateProjectionMatrix()
    // }

    // renderer.render(this.scene, camera)
    // requestAnimationFrame(this.update.bind(this))
  }

  raycast (e, touch = false) {
    var mouse = {}
    if (touch) {
      mouse.x = 2 * (e.changedTouches[0].clientX / window.innerWidth) - 1
      mouse.y = 1 - 2 * (e.changedTouches[0].clientY / window.innerHeight)
    } else {
      mouse.x = 2 * (e.clientX / window.innerWidth) - 1
      mouse.y = 1 - 2 * (e.clientY / window.innerHeight)
    }
    // update the picking ray with the camera and mouse position
    this.raycaster.setFromCamera(mouse, this.camera)

    // calculate objects intersecting the picking ray
    var intersects = this.raycaster.intersectObjects(this.scene.children, true)

    if (intersects[0]) {
      var object = intersects[0].object

      if (object.name === 'stacy') {
        if (!this.currentlyAnimating) {
          this.currentlyAnimating = true
          this.playOnClick()
        }
      }
    }
  }

  // Get a random animation, and play it
  playOnClick () {
    var self = this
    let anim = Math.floor(Math.random() * self.possibleAnims.length) + 0
    this.playModifierAnimation(this.idle, 0.25, self.possibleAnims[anim], 0.25)
  }

  playModifierAnimation (from, fSpeed, to, tSpeed) {
    to.setLoop(THREE.LoopOnce)
    to.reset()
    to.play()
    from.crossFadeTo(to, fSpeed, true)
    setTimeout(() => {
      from.enabled = true
      to.crossFadeTo(from, tSpeed, true)
      this.currentlyAnimating = false
    }, to._clip.duration * 1000 - (tSpeed + fSpeed) * 1000)
  }

  getMousePos (e) {
    return { x: e.clientX, y: e.clientY }
  }

  moveJoint (mouse, joint, degreeLimit) {
    let degrees = this.getMouseDegrees(mouse.x, mouse.y, degreeLimit)
    joint.rotation.y = THREE.Math.degToRad(degrees.x)
    joint.rotation.x = THREE.Math.degToRad(degrees.y)
  }

  getMouseDegrees (x, y, degreeLimit) {
    let dx = 0,
      dy = 0,
      xdiff,
      xPercentage,
      ydiff,
      yPercentage

    let w = { x: window.innerWidth, y: window.innerHeight }

    // Left (Rotates neck left between 0 and -degreeLimit)
    // 1. If cursor is in the left half of screen
    if (x <= w.x / 2) {
      // 2. Get the difference between middle of screen and cursor position
      xdiff = w.x / 2 - x
      // 3. Find the percentage of that difference (percentage toward edge of screen)
      xPercentage = (xdiff / (w.x / 2)) * 100
      // 4. Convert that to a percentage of the maximum rotation we allow for the neck
      dx = ((degreeLimit * xPercentage) / 100) * -1
    }

    // Right (Rotates neck right between 0 and degreeLimit)
    if (x >= w.x / 2) {
      xdiff = x - w.x / 2
      xPercentage = (xdiff / (w.x / 2)) * 100
      dx = (degreeLimit * xPercentage) / 100
    }
    // Up (Rotates neck up between 0 and -degreeLimit)
    if (y <= w.y / 2) {
      ydiff = w.y / 2 - y
      yPercentage = (ydiff / (w.y / 2)) * 100
      // Note that I cut degreeLimit in half when she looks up
      dy = ((degreeLimit * 0.5 * yPercentage) / 100) * -1
    }
    // Down (Rotates neck down between 0 and degreeLimit)
    if (y >= w.y / 2) {
      ydiff = y - w.y / 2
      yPercentage = (ydiff / (w.y / 2)) * 100
      dy = (degreeLimit * yPercentage) / 100
    }
    return { x: dx, y: dy }
  }

  setupEventListeners () {
    var self = this

    window.addEventListener('click', e => this.raycast(e))
    window.addEventListener('touchend', e => this.raycast(e, true))

    document.addEventListener('mousemove', function (e) {
      var mousecoords = self.getMousePos(e)
      if (this.neck && this.waist) {
        this.moveJoint(mousecoords, this.neck, 50)
        this.moveJoint(mousecoords, this.waist, 30)
      }
    })
  }
}

export default AnimatedChar
