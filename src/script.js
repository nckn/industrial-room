import './assets/scss/main.scss'

import * as THREE from 'three'
// import ASScroll from '@ashthornton/asscroll'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
// import * as THREE from '../build/three.module.js';

import { GUI } from 'three/examples/jsm/libs/dat.gui.module.js';
// import { OrbitControls } from './jsm/controls/OrbitControls.js';

import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js'
import { BloomPass } from 'three/examples/jsm/postprocessing/BloomPass.js'

import { RectAreaLightUniformsLib } from 'three/examples/jsm/lights/RectAreaLightUniformsLib.js';
import { RectAreaLightHelper } from 'three/examples/jsm/helpers/RectAreaLightHelper.js'

// import worldposReplace from './worldPosReplace.js'
// import envmapPhysicalParsReplace from './envmapPhysicalParsReplace.js'
// require('./worldPosReplace.js')
// require('./envmapPhysicalParsReplace.js')
// shader injection for box projected cube environment mapping
const worldposReplace = /* glsl */`
#define BOX_PROJECTED_ENV_MAP

#if defined( USE_ENVMAP ) || defined( DISTANCE ) || defined ( USE_SHADOWMAP )

  vec4 worldPosition = modelMatrix * vec4( transformed, 1.0 );

  #ifdef BOX_PROJECTED_ENV_MAP

    vWorldPosition = worldPosition.xyz;

  #endif

#endif
`;

const envmapPhysicalParsReplace = /* glsl */`
#if defined( USE_ENVMAP )

  #define BOX_PROJECTED_ENV_MAP

  #ifdef BOX_PROJECTED_ENV_MAP

    uniform vec3 cubeMapSize;
    uniform vec3 cubeMapPos;
    varying vec3 vWorldPosition;

    vec3 parallaxCorrectNormal( vec3 v, vec3 cubeSize, vec3 cubePos ) {

      vec3 nDir = normalize( v );
      vec3 rbmax = ( .5 * cubeSize + cubePos - vWorldPosition ) / nDir;
      vec3 rbmin = ( -.5 * cubeSize + cubePos - vWorldPosition ) / nDir;

      vec3 rbminmax;
      rbminmax.x = ( nDir.x > 0. ) ? rbmax.x : rbmin.x;
      rbminmax.y = ( nDir.y > 0. ) ? rbmax.y : rbmin.y;
      rbminmax.z = ( nDir.z > 0. ) ? rbmax.z : rbmin.z;

      float correction = min( min( rbminmax.x, rbminmax.y ), rbminmax.z );
      vec3 boxIntersection = vWorldPosition + nDir * correction;

      return boxIntersection - cubePos;
    }

  #endif

  #ifdef ENVMAP_MODE_REFRACTION
    uniform float refractionRatio;
  #endif

  vec3 getLightProbeIndirectIrradiance( /*const in SpecularLightProbe specularLightProbe,*/ const in GeometricContext geometry, const in int maxMIPLevel ) {

    vec3 worldNormal = inverseTransformDirection( geometry.normal, viewMatrix );

    #ifdef ENVMAP_TYPE_CUBE

      #ifdef BOX_PROJECTED_ENV_MAP

        worldNormal = parallaxCorrectNormal( worldNormal, cubeMapSize, cubeMapPos );

      #endif

      vec3 queryVec = vec3( flipEnvMap * worldNormal.x, worldNormal.yz );

      // TODO: replace with properly filtered cubemaps and access the irradiance LOD level, be it the last LOD level
      // of a specular cubemap, or just the default level of a specially created irradiance cubemap.

      #ifdef TEXTURE_LOD_EXT

        vec4 envMapColor = textureCubeLodEXT( envMap, queryVec, float( maxMIPLevel ) );

      #else

        // force the bias high to get the last LOD level as it is the most blurred.
        vec4 envMapColor = textureCube( envMap, queryVec, float( maxMIPLevel ) );

      #endif

      envMapColor.rgb = envMapTexelToLinear( envMapColor ).rgb;

    #elif defined( ENVMAP_TYPE_CUBE_UV )

      vec4 envMapColor = textureCubeUV( envMap, worldNormal, 1.0 );

    #else

      vec4 envMapColor = vec4( 0.0 );

    #endif

    return PI * envMapColor.rgb * envMapIntensity;

  }

  // Trowbridge-Reitz distribution to Mip level, following the logic of http://casual-effects.blogspot.ca/2011/08/plausible-environment-lighting-in-two.html
  float getSpecularMIPLevel( const in float roughness, const in int maxMIPLevel ) {

    float maxMIPLevelScalar = float( maxMIPLevel );

    float sigma = PI * roughness * roughness / ( 1.0 + roughness );
    float desiredMIPLevel = maxMIPLevelScalar + log2( sigma );

    // clamp to allowable LOD ranges.
    return clamp( desiredMIPLevel, 0.0, maxMIPLevelScalar );

  }

  vec3 getLightProbeIndirectRadiance( /*const in SpecularLightProbe specularLightProbe,*/ const in vec3 viewDir, const in vec3 normal, const in float roughness, const in int maxMIPLevel ) {

    #ifdef ENVMAP_MODE_REFLECTION

      vec3 reflectVec = reflect( -viewDir, normal );

      // Mixing the reflection with the normal is more accurate and keeps rough objects from gathering light from behind their tangent plane.
      reflectVec = normalize( mix( reflectVec, normal, roughness * roughness) );

    #else

      vec3 reflectVec = refract( -viewDir, normal, refractionRatio );

    #endif

    reflectVec = inverseTransformDirection( reflectVec, viewMatrix );

    float specularMIPLevel = getSpecularMIPLevel( roughness, maxMIPLevel );

    #ifdef ENVMAP_TYPE_CUBE

      #ifdef BOX_PROJECTED_ENV_MAP
        reflectVec = parallaxCorrectNormal( reflectVec, cubeMapSize, cubeMapPos );
      #endif

      vec3 queryReflectVec = vec3( flipEnvMap * reflectVec.x, reflectVec.yz );

      #ifdef TEXTURE_LOD_EXT

        vec4 envMapColor = textureCubeLodEXT( envMap, queryReflectVec, specularMIPLevel );

      #else

        vec4 envMapColor = textureCube( envMap, queryReflectVec, specularMIPLevel );

      #endif

      envMapColor.rgb = envMapTexelToLinear( envMapColor ).rgb;

    #elif defined( ENVMAP_TYPE_CUBE_UV )

      vec4 envMapColor = textureCubeUV( envMap, reflectVec, roughness );

    #endif

    return envMapColor.rgb * envMapIntensity;
  }
#endif
`;

class App {
  constructor() {
    this.WIDTH = window.innerWidth;
    this.HEIGHT = window.innerHeight;

    this.VIEW_ANGLE = 45;
    this.ASPECT = this.WIDTH / this.HEIGHT;
    this.NEAR = 0.01;
    this.FAR = 20000;

    this.camera = null;
    this.cubeCamera = null;
    this.scene = null;
    this.renderer = null;
    this.container = document.getElementById('container');

    this.controls = null;
    this.gltfLoader = null;

    this.groundPlane = null;
    this.wallMat = null;

    this.uvsWeWantToCopy = '';
    this.planeSize = 60;

    this.composer = null;
    this.clock = null;
    this.delta = null;

    this.textureLoader = new THREE.TextureLoader();

    // shader injection for box projected cube environment mapping
    // this.worldposReplace = /* glsl */`
    // #define BOX_PROJECTED_ENV_MAP
    // ...
    // `;

    // this.envmapPhysicalParsReplace = /* glsl */`
    // #if defined( USE_ENVMAP )
    //   ...
    // #endif
    // `;

    this.init();
  }

  init() {
    let _this = this
    _this.makeMaterials();
    _this.initScene();
    _this.initPostprocessing();
    _this.initMisc();
    _this.addEventListeners();
    _this.loadScene();
  }

  makeMaterials() {
    let _this = this
    // Floor specific material
    _this.bakedSpaceTexture = _this.textureLoader.load('textures/industrial-room-1a.jpg')
    _this.bakedSpaceTexture.flipY = false
    _this.bakedSpaceMaterialFloor = new THREE.MeshStandardMaterial({
      map: _this.bakedSpaceTexture,
      side: THREE.DoubleSide
      // alphaMap: bakedFloorTextureAlphaMap,
      // aoMapIntensity: 0.2,
      // transparent: true
    })
  }

  initScene() {
    let _this = this
    // renderer
    _this.renderer = new THREE.WebGLRenderer({ antialias: true });
    _this.renderer.setPixelRatio(window.devicePixelRatio);
    _this.renderer.setSize(_this.WIDTH, _this.HEIGHT);
    _this.container.appendChild(_this.renderer.domElement);

    // gui controls
    const gui = new GUI();
    const params = {
      'box projected': true
    };
    const bpcemGui = gui.add(params, 'box projected');

    bpcemGui.onChange(function (value) {

      if (value) {

        groundPlane.material = boxProjectedMat;

      } else {

        groundPlane.material = defaultMat;

      }

      render();

    });

    // scene
    _this.scene = new THREE.Scene();

    // camera
    _this.camera = new THREE.PerspectiveCamera(_this.VIEW_ANGLE, _this.ASPECT, _this.NEAR, _this.FAR);
    _this.camera.position.set(280, 106, - 5);

    _this.controls = new OrbitControls(_this.camera, _this.renderer.domElement);
    _this.controls.target.set(0, - 10, 0);
    _this.controls.maxDistance = 800;
    _this.controls.minDistance = 10;
    _this.controls.enableDamping = true
    // _this.controls.addEventListener('change', render);
    _this.controls.update();

    // cube camera for environment map

    const cubeRenderTarget = new THREE.WebGLCubeRenderTarget(512, {
      format: THREE.RGBFormat,
      generateMipmaps: true,
      minFilter: THREE.LinearMipmapLinearFilter
    });
    _this.cubeCamera = new THREE.CubeCamera(1, 1000, cubeRenderTarget);

    _this.cubeCamera.position.set(0, - 100, 0);
    _this.scene.add(_this.cubeCamera);

    // ground floor ( with box projected environment mapping )
    const loader = new THREE.TextureLoader();

    // const rMap = loader.load('textures/lavatile.jpg');
    // const rMap = loader.load('textures/seamless-pattern-organic-texture.jpg');

    // const rMap = loader.load('textures/pexels-photo-3530117.jpg');

    const rMap = loader.load('textures/pexels-photo-12192759.jpg');
    // const rMap = loader.load('textures/pexels-photo-13214152.jpg');

    rMap.wrapS = THREE.RepeatWrapping;
    rMap.wrapT = THREE.RepeatWrapping;
    rMap.repeat.set(1, 1);

    // the space texture again
    const floorTexture = _this.textureLoader.load('textures/floor-texture.jpg')
    floorTexture.wrapS = THREE.RepeatWrapping;
    floorTexture.wrapT = THREE.RepeatWrapping;
    // floorTexture.repeat.set(0.5, 0.5);
    // const matrix = new THREE.Matrix3();
    // matrix.set(
    //   1, 0, 0,
    //   0, -1, 0,
    //   0, 0, 1
    // );
    // floorTexture.matrix = matrix;
    // floorTexture.flipY = false
    floorTexture.offset.set(0.01, 0.01);

    const defaultMat = new THREE.MeshPhysicalMaterial({
      roughness: 1,
      // map: bakedSpaceMaterialFloor,
      envMap: cubeRenderTarget.texture,
      roughnessMap: rMap,
      // opacity: 0.2
    });

    const boxProjectedMat = new THREE.MeshPhysicalMaterial({
      // color: new THREE.Color('#ffffff'),
      color: new THREE.Color('#222222'),
      roughness: 1,
      // opacity: 0.2,
      envMap: cubeRenderTarget.texture,
      map: floorTexture,
      roughnessMap: rMap,
      side: THREE.DoubleSide
    });

    boxProjectedMat.onBeforeCompile = function (shader) {

      //these parameters are for the cubeCamera texture
      shader.uniforms.cubeMapSize = { value: new THREE.Vector3(200, 200, 100) };
      shader.uniforms.cubeMapPos = { value: new THREE.Vector3(0, - 50, 0) };

      //replace shader chunks with box projection chunks
      shader.vertexShader = 'varying vec3 vWorldPosition;\n' + shader.vertexShader;

      shader.vertexShader = shader.vertexShader.replace(
        '#include <worldpos_vertex>',
        worldposReplace
      );

      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <envmap_physical_pars_fragment>',
        envmapPhysicalParsReplace
      );

    };

    // const floorGeometry = new THREE.PlaneBufferGeometry(planeSize, planeSize, 100)
    const floorGeometry = new THREE.PlaneGeometry(_this.planeSize, _this.planeSize, 100)

    // Most recent - This should copy the UV info from the Floor, but for now it is just blank
    // floorGeometry.setAttribute('uv', new THREE.BufferAttribute(uvsWeWantToCopy, 2))

    _this.groundPlane = new THREE.Mesh(floorGeometry, boxProjectedMat);
    _this.groundPlane.rotateX(- Math.PI / 2);
    // _this.groundPlane.position.set(0, - 49, 0);
    _this.groundPlane.position.set(0, - 49, 0);
    _this.groundPlane.scale.set(6, 6, 6)
    _this.scene.add(_this.groundPlane);

    // walls
    const diffuseTex = loader.load('textures/brick_diffuse.jpg', function () {

      // _this.updateCubeMap.bind(_this);
      _this.updateCubeMap();

    });
    const bumpTex = loader.load('textures/brick_bump.jpg', function () {

      _this.updateCubeMap();

    });

    _this.wallMat = new THREE.MeshPhysicalMaterial({
      map: diffuseTex,
      bumpMap: bumpTex,
      bumpScale: 0.3,
    });

    const planeGeo = new THREE.PlaneBufferGeometry(100, 100);

    const planeBack1 = new THREE.Mesh(planeGeo, _this.wallMat);
    planeBack1.position.z = - 50;
    planeBack1.position.x = - 50;

    const planeBack2 = new THREE.Mesh(planeGeo, _this.wallMat);
    planeBack2.position.z = - 50;
    planeBack2.position.x = 50;

    const planeFront1 = new THREE.Mesh(planeGeo, _this.wallMat);
    planeFront1.position.z = 50;
    planeFront1.position.x = - 50;
    planeFront1.rotateY(Math.PI);

    const planeFront2 = new THREE.Mesh(planeGeo, _this.wallMat);
    planeFront2.position.z = 50;
    planeFront2.position.x = 50;
    planeFront2.rotateY(Math.PI);

    // Add walls
    // scene.add(planeBack1);
    // scene.add(planeBack2);
    // scene.add(planeFront1);
    // scene.add(planeFront2);

    const planeRight = new THREE.Mesh(planeGeo, _this.wallMat);
    planeRight.position.x = 100;
    planeRight.rotateY(- Math.PI / 2);
    // scene.add(planeRight);

    const planeLeft = new THREE.Mesh(planeGeo, _this.wallMat);
    planeLeft.position.x = - 100;
    planeLeft.rotateY(Math.PI / 2);
    // scene.add(planeLeft);

    //lights
    const width = 50;
    const height = 50;
    const intensity = 10;

    RectAreaLightUniformsLib.init();

    const lampY = 92
    // Area light 1 - orange
    const rectLightOne = new THREE.RectAreaLight(0xf3aaaa, intensity, width, height);
    rectLightOne.position.set(-72, lampY, -72);
    rectLightOne.lookAt(-72, 0, -72);
    // rectLightOne.rotateX(-Math.PI / 2);
    _this.scene.add(rectLightOne);
    const rectLightOneHelper = new RectAreaLightHelper(rectLightOne);
    rectLightOne.add(rectLightOneHelper);
    // rectLight 1 - end

    // rect light 2 - orange
    const rectLightTwo = new THREE.RectAreaLight(0xf3aaaa, intensity, width, height);
    rectLightTwo.position.set(72, lampY, -72);
    rectLightTwo.lookAt(72, 0, -72);
    // rectLightTwo.rotateX(-Math.PI / 2);
    _this.scene.add(rectLightTwo);
    const rectLightTwoHelper = new RectAreaLightHelper(rectLightTwo);
    rectLightTwo.add(rectLightTwoHelper);
    // rectLight 2 - end

    // rect light 3 - blue
    const rectLightThr = new THREE.RectAreaLight(0x9aaeff, intensity, width, height);
    rectLightThr.position.set(-72, lampY, 72);
    rectLightThr.lookAt(-72, 0, 72);
    _this.scene.add(rectLightThr);
    const rectLightThrHelper = new RectAreaLightHelper(rectLightThr);
    rectLightThr.add(rectLightThrHelper);
    // rect light 3 - end

    // rect light 4 - blue
    const rectLightFou = new THREE.RectAreaLight(0x9aaeff, intensity, width, height);
    rectLightFou.position.set(72, lampY, 72);
    rectLightFou.lookAt(72, 0, 72);
    _this.scene.add(rectLightFou);
    const rectLightFouHelper = new RectAreaLightHelper(rectLightFou);
    rectLightFou.add(rectLightFouHelper);
    // rect light 3 - end

    _this.initPostprocessing()

    _this.render();
  }

  initPostprocessing() {
    // create an EffectComposer
    this.composer = new EffectComposer(this.renderer);

    // create a RenderPass and add it to the composer
    const renderPass = new RenderPass(this.scene, this.camera);
    this.composer.addPass(renderPass);

    // create a BloomPass and add it to the composer
    const bloomPass = new BloomPass(1, 25, 4, 256);
    this.composer.addPass(bloomPass);
  }

  initMisc() {
    this.clock = new THREE.Clock();
  }

  addEventListeners() {
    window.addEventListener('resize', this.onResize.bind(this));
  }

  loadScene() {
    let _this = this
    this.gltfLoader = new GLTFLoader();

    this.gltfLoader.load(
      'models/industrial-room-1a.glb',
      (gltf) => {
        gltf.scene.traverse((child) => {
          console.log(child.name);

          if (
            child.name === 'Floor' ||
            child.name === 'Wall1' ||
            child.name === 'Wall2' ||
            child.name === 'Wall3' ||
            child.name === 'Wall4' ||
            child.name === 'Cylinder' ||
            child.name === 'Cylinder001' ||
            child.name === 'Cube' ||
            child.name === 'Chair1'
          ) {
            child.material = _this.bakedSpaceMaterialFloor
            child.material.side = THREE.FrontSide
          }

          if (child.name === 'Floor') {
            child.visible = false;
            this.uvsWeWantToCopy = child.geometry.attributes.uv.array;

            const boundingBox = new THREE.Box3().setFromObject(child);
            const width = boundingBox.max.x - boundingBox.min.x;
            const height = boundingBox.max.y - boundingBox.min.y;
            const depth = boundingBox.max.z - boundingBox.min.z;

            console.log('Width:', width);
            console.log('Height:', height);
            console.log('Depth:', depth);
          }

          if (child.name === 'Wall2') {
            child.visible = false;
          }
        });

        const groupScene = new THREE.Group();
        gltf.scene.scale.set(6, 6, 6);
        gltf.scene.position.set(0, -51.5, 0);

        groupScene.add(gltf.scene);
        this.scene.add(groupScene);
      }
    );

    this.addLights();
  }

  addLights() {
    // Ambient light
    let _this = this
    const light = new THREE.AmbientLight(0x909090, 0.5) // 0.25 soft white light
    _this.scene.add(light)

    // Directional light
    let directionalLight = new THREE.DirectionalLight(0xffffff, 0.25)
    directionalLight.position.set(0, 8, 0)
    // scene.add(directionalLight)
  }

  update() {
    this.controls.update();

    const time = this.clock.getElapsedTime();
    const uniforms = this.groundPlane.material.uniforms;
    uniforms.uTime.value = time;

    this.renderer.render(this.scene, this.camera);

    if (this.composer) {
      this.composer.render();
    }
  }

  updateCubeMap() {

    //disable specular highlights on walls in the environment map
    this.wallMat.roughness = 1;
    this.groundPlane.visible = false;
    this.cubeCamera.position.copy(this.groundPlane.position);
    this.cubeCamera.update(this.renderer, this.scene);
    this.wallMat.roughness = 0.6;
    this.groundPlane.visible = true;
    // render();
  }

  onResize() {
    this.WIDTH = window.innerWidth;
    this.HEIGHT = window.innerHeight;

    this.ASPECT = this.WIDTH / this.HEIGHT;

    this.renderer.setSize(this.WIDTH, this.HEIGHT);
    this.camera.aspect = this.ASPECT;
    this.camera.updateProjectionMatrix();

    this.controls.update()
  }

  render() {
    let _this = this
    // this.delta = this.clock.getDelta();

    // update your scene and camera here
    _this.renderer.render(_this.scene, _this.camera);
    // Do it with the FX composer
    // composer.render()

    // controls.update()

    // console.log(controls)
    _this.controls.update();

    _this.animate()

    requestAnimationFrame(_this.render.bind(_this));
  }

  animate() {
    let _this = this
    // _this.delta = _this.clock.getDelta();
  }
}

// new App().animate();
document.addEventListener("DOMContentLoaded", (event) => {
  const app = new App()
})
