// shader injection for box projected cube environment mapping
// export const worldposReplace = /* glsl */
const worldposReplace = /* glsl */
`
#define BOX_PROJECTED_ENV_MAP

#if defined( USE_ENVMAP ) || defined( DISTANCE ) || defined ( USE_SHADOWMAP )

  vec4 worldPosition = modelMatrix * vec4( transformed, 1.0 );

  #ifdef BOX_PROJECTED_ENV_MAP

    vWorldPosition = worldPosition.xyz;

  #endif

#endif
`;