import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

// Path to your real room model. Drop a new .glb here (same filename) to swap it out.
export const MODEL_PATH = "models/room.glb";

/**
 * Loads the room .glb, sets up shadows on every mesh inside it, and reports
 * progress (0-1) via onProgress so the loading screen can show a percentage.
 * Resolves with { model, box } where box is the model's world-space bounding box.
 */
export function loadRoomModel(onProgress) {
  const loader = new GLTFLoader();
  return new Promise((resolve, reject) => {
    loader.load(
      MODEL_PATH,
      (gltf) => {
        const model = gltf.scene;
        model.traverse((obj) => {
          if (obj.isMesh) {
            obj.castShadow = true;
            obj.receiveShadow = true;
            if (obj.material) {
              // metalness/roughness/normal maps are non-color data —
              // make sure three.js doesn't sRGB-decode them.
              const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
              mats.forEach((m) => {
                if (m.map) m.map.colorSpace = THREE.SRGBColorSpace;
              });
            }
          }
        });
        let box = new THREE.Box3().setFromObject(model);
        let size = box.getSize(new THREE.Vector3());

        // Some exports come in at the wrong real-world scale — this can
        // happen if an object's scale wasn't "applied" in Blender before
        // export (or a remesh/edit reset it). A real bedroom ceiling is
        // roughly 2.2-2.8m; if the loaded model comes in far smaller than
        // that, every one of our absolute-meter constants elsewhere (carpet
        // displacement, ceiling fixture drop, obstacle collision margins,
        // shadow bias) would be wildly out of proportion to the actual
        // geometry — that's what causes the carpet/ceiling to visibly
        // clip through walls and furniture. Auto-correct by rescaling the
        // whole model uniformly so it's back to a believable real-world size.
        const TARGET_HEIGHT = 2.4;
        if (size.y > 0 && size.y < 1) {
          const factor = TARGET_HEIGHT / size.y;
          model.scale.multiplyScalar(factor);
          model.updateMatrixWorld(true);
          box = new THREE.Box3().setFromObject(model);
          size = box.getSize(new THREE.Vector3());
          console.warn(
            `loadRoomModel: model loaded at an unrealistic scale (${size.y.toFixed(3)}m tall after auto-correct, ` +
            `was ${(size.y / factor).toFixed(3)}m) — auto-rescaled ${factor.toFixed(2)}x. ` +
            `Check the object's scale was applied before export in Blender if this looks off.`
          );
        }

        resolve({ model, box });
      },
      (evt) => {
        if (onProgress && evt.total) onProgress(evt.loaded / evt.total);
      },
      (err) => reject(err)
    );
  });
}
