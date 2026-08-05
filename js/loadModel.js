import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

// Path to your real room model. Drop a new .glb here (same filename) to swap it out.
export const MODEL_PATH = "models/room.glb";

// GitHub hard-rejects any single file over 100MB. room.glb kept creeping back
// over that line as the self-portrait/books/pegboard/etc. content grew, so
// the handful of objects that were disproportionately heavy for what they
// are (a desk phone prop and a couple of decorative ladybugs ended up over
// 40MB combined, plus the "CLOSET ITEMS- merch" group — which turned out to
// also be the shared parent of the rack shirts and the shoe, not just merch)
// were split into this second file. It's loaded alongside the main one and
// merged into the same model group below, BEFORE main.js ever gets to wire
// up any interactivity — so nothing about how the room behaves changes,
// this is purely a "which file the bytes came from" split.
export const EXTRAS_MODEL_PATH = "models/room-extras.glb";

// The fake-outside-the-window backdrop (see WINDOW_BACKDROP_MESH_PATTERN in
// main.js) sits deliberately OUTSIDE the room's real footprint — that's the
// whole point of it. But it's still part of the same glTF, so a plain
// "bounding box of everything" swallows it too, which blows out the box
// used for EVERY room-relative measurement (camera start height/position,
// ceiling size, carpet size, WASD walk bounds) — explains starting position
// landing inside a wall and the camera reading "too short" right after the
// backdrop was added. Excluded here so the room's own footprint stays the
// actual room's footprint regardless of how far out the backdrop reaches.
const ROOM_BOUNDS_EXCLUDE_PATTERN = /^WindowBackdrop/i;

/**
 * Loads the room .glb, sets up shadows on every mesh inside it, and reports
 * progress (0-1) via onProgress so the loading screen can show a percentage.
 * Resolves with { model, box } where box is the model's world-space bounding box.
 */
export function loadRoomModel(onProgress) {
  const loader = new GLTFLoader();

  // both files' progress is tracked separately and combined into one
  // overall fraction below — the loading screen shouldn't jump backwards
  // or stall just because one file happens to be smaller than the other.
  // Some servers (GitHub Pages' CDN included) don't always send a
  // Content-Length for these, so a progress event's evt.total can come
  // back 0/undefined for one file while the other reports normally —
  // dividing loaded-so-far by an incomplete total is what caused the
  // percentage to read over 100%. Clamping here keeps the display sane
  // either way; it doesn't affect whether the actual load succeeds.
  const progressState = { main: { loaded: 0, total: 0 }, extras: { loaded: 0, total: 0 } };
  function reportProgress() {
    if (!onProgress) return;
    const totalLoaded = progressState.main.loaded + progressState.extras.loaded;
    const totalBytes = progressState.main.total + progressState.extras.total;
    if (totalBytes) onProgress(Math.min(1, totalLoaded / totalBytes));
  }
  function loadGltf(path, key) {
    return new Promise((resolve, reject) => {
      loader.load(
        path,
        resolve,
        (evt) => {
          progressState[key].loaded = evt.loaded;
          if (evt.total) progressState[key].total = evt.total;
          reportProgress();
        },
        reject
      );
    });
  }

  return Promise.all([loadGltf(MODEL_PATH, "main"), loadGltf(EXTRAS_MODEL_PATH, "extras")]).then(
    ([gltfMain, gltfExtras]) => {
      const model = gltfMain.scene;
      // merge the extras scene's top-level children straight into the main
      // model, BEFORE anything below (shadow setup, box computation, or any
      // of main.js's later interactivity wiring) runs — from this point on
      // it's just "the model," regardless of which file a given mesh
      // actually came from
      const extrasScene = gltfExtras.scene;
      while (extrasScene.children.length) {
        model.add(extrasScene.children[0]);
      }

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
      function computeRoomBox(root) {
        // THREE.Box3().setFromObject() normally does this internally
        // (a full top-down refresh of every matrixWorld in the
        // hierarchy) before reading any geometry — expandByObject on its
        // own does NOT do that full refresh, so skipping this meant the
        // box was being computed off stale/default matrices instead of
        // real world-space transforms. That's what was actually causing
        // the black screen (a badly wrong box → a broken camera position),
        // not the backdrop object itself.
        root.updateMatrixWorld(true);
        const b = new THREE.Box3();
        let any = false;
        root.traverse((obj) => {
          if (!obj.isMesh || ROOM_BOUNDS_EXCLUDE_PATTERN.test(obj.name)) return;
          b.expandByObject(obj);
          any = true;
        });
        // fallback: if somehow nothing matched (unexpected model structure),
        // don't return an empty/invalid box — use the whole model instead
        return any ? b : new THREE.Box3().setFromObject(root);
      }

      let box = computeRoomBox(model);
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
        box = computeRoomBox(model);
        size = box.getSize(new THREE.Vector3());
        console.warn(
          `loadRoomModel: model loaded at an unrealistic scale (${size.y.toFixed(3)}m tall after auto-correct, ` +
          `was ${(size.y / factor).toFixed(3)}m) — auto-rescaled ${factor.toFixed(2)}x. ` +
          `Check the object's scale was applied before export in Blender if this looks off.`
        );
      }

      return { model, box };
    }
  );
}
