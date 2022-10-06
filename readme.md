# Three.js Journey

## Setup
Download [Node.js](https://nodejs.org/en/download/).
Run this followed commands:

``` bash
# Install dependencies (only the first time)
npm install

# Run the local server at localhost:8080
npm run dev

# Build for production in the dist/ directory
npm run build
```

TODO
- make 45 degrees angle on and make subtle cam movement, add fadeout to floor and walls, then a super case to show people.
- post-processing
- add scroll camera track and allow pan on top of this
- add sound from industrial space
- add volumetric spot
- add typography
- make into object
- 
- tv shader w/ post-processing lines (type)
- 

Video clip from Old TV time
https://www.youtube.com/channel/UCUj8lkSnX-BnTXBYj8kwvsQ



- - -  
Info
#### Where is the gooey blob anim time set?
### LongPress.js/ in tick() method

## Tutorials
### How to Create an Interactive 3D Character with Three.js
https://tympanus.net/codrops/2019/10/14/how-to-create-an-interactive-3d-character-with-three-js/

### Mixamo
https://www.mixamo.com/#/?page=1&query=typing

### Threejs example
https://threejs.org/examples/#webgl_animation_skinning_additive_blending
https://github.com/mrdoob/three.js/blob/master/examples/webgl_animation_skinning_blending.html

### UV Un-wrapping, Baking and exporting
https://threejs-journey.xyz/lessons/34
ca 1:30:00 in...

Bake only shadows
https://blender.stackexchange.com/questions/41555/how-do-i-bake-a-transparent-shadow-texture-using-cycles-bake



TODO
- this.camera.fov = 2*Math.atan( (this.height/2)/600 ) * 180/Math.PI

- correct offset of marker
- record sound for coffee
- new coffee particles
- ABOUT or other nav item action
- 
- enable webcam and show as video texture
- add raycaster cursor drawing on whiteboard
- add pan to used in planets
- make light inherit area light from Blender


Info
- The width of the .size-determiner determines the scroll length

Deploy
https://typography-in-3d.netlify.app