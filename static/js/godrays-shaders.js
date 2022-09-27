var godrayVShader = `
  varying vec3 vNormal;
  varying vec3 vWorldPosition;

  void main() {
    // compute intensity,
    vNormal = normalize( normalMatrix * normal );

    vec4 worldPosition = modelMatrix * vec4( position, 1.0 );
    vWorldPosition = worldPosition.xyz;

    // set gl_Position,
    gl_Position	= projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
  }
`;

var godrayFShader = `
  varying vec3 vNormal;
  varying vec3 vWorldPosition;

  uniform vec3 lightColor;

  uniform vec3 spotPosition;

  uniform float attenuation;
  uniform float anglePower;

  void main() {
    float intensity;

    //////////////////////////////////////////////////////////
    // distance attenuation					//
    //////////////////////////////////////////////////////////
    intensity	= distance(vWorldPosition, spotPosition) / attenuation;
    intensity	= 1.0 - clamp(intensity, 0.0, 1.0);

    //////////////////////////////////////////////////////////
    // intensity on angle					//
    //////////////////////////////////////////////////////////
    vec3 normal	= vec3(vNormal.x, vNormal.y, abs(vNormal.z));
    float angleIntensity	= pow( dot(normal, vec3(0.0, 0.0, 1.0)), anglePower );
    intensity	= intensity * angleIntensity;
    // gl_FragColor	= vec4( lightColor, intensity );,

    //////////////////////////////////////////////////////////
    // final color						//
    //////////////////////////////////////////////////////////

    // set the final color
    gl_FragColor = vec4(lightColor, intensity);
  }
`;

export default { godrayVShader, godrayFShader }