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

      if (seen.has(mat)) return seen.get(mat);

      // most "_baked" materials carry a real baked texture, but a flat,
      // untextured object (e.g. the lashes — just a solid color, no map)
      // can be "baked" too in the sense that it should always show its
      // authored color regardless of scene lighting. MeshBasicMaterial's
      // `color` already defaults from the glTF material's baseColorFactor,
      // so this works with or without a map.
      // a bake is a single unique UV-mapped snapshot of one object — it
      // should never tile. Some meshes (e.g. "Main wall 1_n3d") have UVs
      // that run outside the normal 0-1 range (down to about -1.04), and
      // the glTF/three.js default wrap mode is REPEAT, so that extra range
      // was showing the whole texture a second time smeared across the
      // wall (the doubled floral/dot pattern + repeated black poster-cutout
      // rectangles). Clamping stops it from tiling — anything past the
      // texture's real 0-1 edge just holds that edge pixel instead.
      if (mat.map) {
        mat.map.wrapS = THREE.ClampToEdgeWrapping;
        mat.map.wrapT = THREE.ClampToEdgeWrapping;
        mat.map.needsUpdate = true;
      }

      // Hair is modeled as several overlapping alpha strand cards in ONE
      // mesh — glTF exported it as alphaMode BLEND, which three.js renders
      // by soft-blending triangles in whatever order they happen to be
      // stored in, NOT sorted correctly against each other. Overlapping
      // semi-transparent edges compositing in the wrong order is exactly
      // what reads as pale, nonsensical streaks cutting across the strands
      // (confirmed against a Blender viewport render showing none of this —
      // Blender's transparency handling doesn't have this limitation, so it
      // never shows up there). Alpha-testing instead of blending sidesteps
      // the whole problem: each pixel is either fully opaque or fully
      // discarded, so there's nothing left to blend in the wrong order.
      // Trade-off is slightly harder (non-antialiased) strand edges instead
      // of soft ones — standard for real-time hair cards, and much better
      // than the streaking.
      const isHairCard = /hair/i.test(obj.name);

      const baked = new THREE.MeshBasicMaterial({
        name: mat.name,
        map: mat.map || null,
        color: mat.color,
        transparent: isHairCard ? false : mat.transparent,
        alphaTest: isHairCard ? 0.5 : mat.alphaTest,
        side: mat.side,
      });
      // the whole point of a bake is "show exactly what's in the texture" --
      // the renderer's ACES tone mapping + exposure curve (see main.js) is
      // meant for real-time lit surfaces and otherwise uniformly darkens/
      // recompresses every color, baked or not. Opting out here is what
      // was actually causing baked objects to read darker than their source
      // texture, not a normal map (MeshBasicMaterial doesn't use one at all).
      baked.toneMapped = false;
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
