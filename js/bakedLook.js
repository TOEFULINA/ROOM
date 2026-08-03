import * as THREE from "three";

// Companion to blender/bake_lighting.py + BAKING_GUIDE.md.
//
// The bake script names every material it produces "<object>_<slot>_baked"
// and rewires it to show the baked texture. That "_baked" suffix is the
// signal this file looks for — nothing else in your current room.glb is
// named that way, so this is a no-op (falls straight through, model looks
// exactly like it does today) until you've actually run the bake and
// dropped in the new room.glb. No flag to flip, no half-migrated state to
// worry about — it just upgrades itself the moment real baked textures
// show up.
const BAKED_MATERIAL_SUFFIX = "_baked";

/**
 * Swaps every "_baked" material in the model for an unlit MeshBasicMaterial
 * showing the same baked texture — the actual "unlit, lighting is printed
 * onto the texture" look the reference site uses. Everything else (glass,
 * water, the video screen, anything not yet baked) is left completely
 * alone, so this only ever adds the new look, never breaks what's already
 * working.
 *
 * Call this once, right after the model loads and before any of the
 * existing per-mesh material special-casing in main.js — it only touches
 * materials that end in "_baked", so it can't step on that later logic.
 */
export function applyBakedLook(model) {
  let convertedCount = 0;
  const seen = new Map(); // material -> converted material, so shared "_baked" materials aren't rebuilt per-mesh

  model.traverse((obj) => {
    if (!obj.isMesh) return;
    const materials = Array.isArray(obj.material) ? obj.material : [obj.material];

    const nextMaterials = materials.map((mat) => {
      if (!mat || !mat.name || !mat.name.endsWith(BAKED_MATERIAL_SUFFIX)) return mat;
      if (!mat.map) {
        console.warn(`bakedLook: material "${mat.name}" ends in "${BAKED_MATERIAL_SUFFIX}" but has no baked texture — leaving it as-is.`);
        return mat;
      }

      if (seen.has(mat)) return seen.get(mat);

      const baked = new THREE.MeshBasicMaterial({
        name: mat.name,
        map: mat.map,
        transparent: mat.transparent,
        alphaTest: mat.alphaTest,
        side: mat.side,
      });
      // the bake already includes real, direction-correct shading — a
      // basic material can't receive/cast dynamic shadows, which is
      // exactly right here (a second dynamic shadow on top of a baked one
      // would double up and look wrong)
      seen.set(mat, baked);
      convertedCount++;
      return baked;
    });

    if (nextMaterials.some((m, i) => m !== materials[i])) {
      obj.material = Array.isArray(obj.material) ? nextMaterials : nextMaterials[0];
      obj.castShadow = false;
      obj.receiveShadow = false;
    }
  });

  if (convertedCount > 0) {
    console.info(`bakedLook: switched ${convertedCount} baked material(s) to unlit.`);
  }

  return convertedCount;
}
