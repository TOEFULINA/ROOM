import * as THREE from "three";

// Shared plumbing for every interactive "screen" prop that draws a 2D UI
// onto a canvas and routes clicks back into it via the mesh's own raycast
// UV (desk computer, phone).
//
// The desk computer's screen was the first one wired up, and three rounds of
// real screenshots nailed down exactly what this model's screen quad does to
// whatever texture it's given:
//   1. Before any correction: text drawn horizontally rendered top-to-bottom,
//      one letter per row, in the original left-to-right order — AND each
//      letter still read as a normal, non-mirrored letter. That combination
//      (order preserved, no mirroring, 90° of turn) is only possible from a
//      proper rotation, never a flip/transpose (a coordinate swap always
//      mirrors chirality, which would make individual letters read
//      backwards — it looked right at first glance but was the wrong model).
//   2. A first attempt "fixed" this with a coordinate transpose (swap x/y).
//      That undid the 90° turn but, because a transpose IS a mirror, it
//      introduced backwards/upside-down letters ("/" rendering as "\", etc)
//      that weren't there in (1) — direct confirmation the real bug is a
//      rotation, not a reflection.
// The correction below is a genuine 90°, non-mirroring rotation of the
// logical canvas before it becomes the texture — composed with the mesh's
// own 90° rotation, the two cancel out and the logical layout displays
// right-side up with no mirroring. Both the computer and phone screens are
// assumed to share this same UV convention (same artist, same export
// pipeline) until a real screenshot of the phone proves otherwise.
export function createInteractiveScreen(logicalWidth, logicalHeight) {
  const canvas = document.createElement("canvas");
  canvas.width = logicalWidth;
  canvas.height = logicalHeight;
  const ctx = canvas.getContext("2d");

  // the exported texture is the transpose of the logical canvas — swapped
  // dimensions, see module comment above
  const texCanvas = document.createElement("canvas");
  texCanvas.width = logicalHeight;
  texCanvas.height = logicalWidth;
  const texCtx = texCanvas.getContext("2d");

  const texture = new THREE.CanvasTexture(texCanvas);
  texture.colorSpace = THREE.SRGBColorSpace;

  let hitboxes = []; // [{x,y,w,h,action}], in LOGICAL canvas pixel space

  function addHitbox(x, y, w, h, action) {
    hitboxes.push({ x, y, w, h, action });
  }

  // Call once at the start of every draw pass — clears the hitbox list so
  // stale regions from the previous frame (e.g. a window that just closed)
  // can never linger and catch a click nothing is drawn over anymore.
  function beginFrame() {
    hitboxes = [];
  }

  // Call once at the end of every draw pass, after all drawing into `ctx`
  // is done — copies the finished logical canvas into the real texture,
  // rotated 90° to cancel the mesh's own 90° turn, and flags it for GPU
  // re-upload.
  function commit() {
    texCtx.setTransform(1, 0, 0, 1, 0, 0);
    texCtx.clearRect(0, 0, texCanvas.width, texCanvas.height);
    // canvas transform (a,b,c,d,e,f) maps a source point (sx,sy) to
    // (a*sx+c*sy+e, b*sx+d*sy+f). (0,-1,1,0,0,W) maps (sx,sy) ->
    // (sy, W-sx) — a proper 90° rotation (determinant = 0*0-(-1)*1 = 1,
    // no mirroring), not the transpose this used to be.
    texCtx.setTransform(0, -1, 1, 0, 0, canvas.width);
    texCtx.drawImage(canvas, 0, 0);
    texCtx.setTransform(1, 0, 0, 1, 0, 0);
    texture.needsUpdate = true;
  }

  // Converts a raycast UV hit into LOGICAL canvas pixel space and returns
  // whatever hitbox (if any) the last commit() produced there — the inverse
  // of the rotation commit() applies above, worked out algebraically rather
  // than guessed (see module comment for how the rotation itself was
  // determined from real screenshots).
  function pickHitbox(u, v) {
    const logicalX = v * canvas.width;
    const logicalY = u * canvas.height;
    return hitboxes.find(
      (h) => logicalX >= h.x && logicalX <= h.x + h.w && logicalY >= h.y && logicalY <= h.y + h.h
    );
  }

  return { canvas, ctx, texture, addHitbox, beginFrame, commit, pickHitbox };
}
