import * as THREE from "three";

// Shared plumbing for every interactive "screen" prop that draws a 2D UI
// onto a canvas and routes clicks back into it via the mesh's own raycast
// UV (desk computer, phone).
//
// The desk computer's screen was the first one wired up, and a real
// screenshot showed the model's screen quad has its UV laid out TRANSPOSED
// relative to the "obvious" flat mapping: text drawn horizontally came back
// rendering top-to-bottom, one letter per row, in the original left-to-right
// order — the exact signature of a pure coordinate transpose (swap x/y, no
// flip), confirmed from the actual render rather than guessed.
//
// Rather than fight that per-mesh inside every screen's own drawing code,
// each screen draws into a normal "logical" canvas (sized however makes
// sense for that screen's own layout) and this module transposes it once
// into the real exported texture. Transpose is its own inverse, so composed
// with the mesh's existing transpose the two cancel out and the logical
// layout ends up displaying right-side up. Both the computer and phone
// screens are assumed to share this same UV convention (same artist, same
// export pipeline) until a real screenshot of the phone proves otherwise.
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
  // is done — copies the finished logical canvas into the real texture
  // (transposed) and flags it for GPU re-upload.
  function commit() {
    texCtx.setTransform(1, 0, 0, 1, 0, 0);
    texCtx.clearRect(0, 0, texCanvas.width, texCanvas.height);
    // canvas transform (a,b,c,d,e,f) maps a source point (sx,sy) to
    // (a*sx+c*sy+e, b*sx+d*sy+f); (0,1,1,0,0,0) maps (sx,sy) -> (sy,sx) —
    // exactly a transpose. drawImage then just walks the source 1:1 through
    // that transform.
    texCtx.setTransform(0, 1, 1, 0, 0, 0);
    texCtx.drawImage(canvas, 0, 0);
    texCtx.setTransform(1, 0, 0, 1, 0, 0);
    texture.needsUpdate = true;
  }

  // Converts a raycast UV hit into LOGICAL canvas pixel space and returns
  // whatever hitbox (if any) the last commit() produced there. Inverts BOTH
  // the texture's default flipY (three.js CanvasTexture convention: v=0 is
  // the texture's bottom row) AND the transpose commit() applies above —
  // commit() maps source(sx,sy) -> tex(sy,sx), i.e. tex(x,y) shows
  // source(y,x), so recovering logical (sx,sy) from a texture-space hit
  // means swapping x and y back.
  function pickHitbox(u, v) {
    const texX = u * texCanvas.width;
    const texY = (1 - v) * texCanvas.height;
    const logicalX = texY;
    const logicalY = texX;
    return hitboxes.find(
      (h) => logicalX >= h.x && logicalX <= h.x + h.w && logicalY >= h.y && logicalY <= h.y + h.h
    );
  }

  return { canvas, ctx, texture, addHitbox, beginFrame, commit, pickHitbox };
}
