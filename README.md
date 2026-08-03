# your room — an interactive 3D portfolio

A Three.js scene of your actual room (loaded from `models/room.glb`, the
model you exported) that doubles as a portfolio: click through the vinyl
crate — the real one from your model, with your real cover art baked onto
each record — and browse clothing/fashion pieces on the closet rod.

No build tools, no npm install, no upload screen — the model is a static
file baked into the site and loaded automatically. It's plain HTML/CSS/JS,
loaded via a CDN.

## Your room model

`models/room.glb` is the file that's actually displayed. Your original
export was 215MB (mostly full-res PNG textures), which is too big to load
over the web — it's been re-compressed to ~76MB: normal maps (walls, vinyl,
everything) are lossless WebP — lossy compression corrupts normal maps with
visible blotchy artifacts, which is why they're kept lossless even though
it costs more file size — and other textures (color, metal/roughness) are
resized and compressed more aggressively. Geometry is untouched.

**To swap in a new version:** export a new `.glb` and replace
`models/room.glb` with it (same filename). If it's a large export again,
ask Claude to re-run the same compression pass, or run it through
[gltf-transform](https://gltf-transform.dev/) yourself.

**The vinyl crate is real:** your model already has a `Record_box` mesh
with 20 individual `Vinyl_1`..`Vinyl_20` records, each with its own cover
art baked on as a texture. `main.js` finds those meshes by name and makes
them clickable directly — no separate fake crate is built. If you add more
records to the model later, name them `Vinyl_21`, `Vinyl_22`, etc. and
they'll automatically become clickable too.

**Positioning the clickable closet:** the hanging clothes aren't part of
your model — they're separate objects floated into the scene so they stay
clickable (your model doesn't have individual garment meshes). Open
`js/room.js` and edit the `HOTSPOTS.closetRod` x/y/z near the top to line
the rod up with the real closet in your model. The camera auto-frames
itself around your model's bounding box, so no camera tuning needed unless
you want to adjust the starting angle (`main.js`, inside the
`loadRoomModel(...).then(...)` block).

## 1. Run it on your computer

Browsers block 3D scenes like this from running when you just double-click
the `index.html` file, so it needs a tiny local server. Easiest options:

**Mac, one click:**
Double-click `start-mac.command` in this folder. It'll open the site in your
browser automatically. (First time only: right-click → Open, to get past the
security warning, since it's not from the App Store.)

**Any computer, with Python already installed:**
```
cd path/to/this/folder
python3 -m http.server 8000
```
Then open `http://localhost:8000` in your browser.

**VS Code:**
Install the "Live Server" extension, right-click `index.html`, choose
"Open with Live Server".

## 2. Add your real clothing/fashion pieces

Vinyl cover art comes straight from your model now (see above) — the only
thing left to edit by hand is **`js/data.js`**'s `CLOTHING` list. Open it in
any text editor (even TextEdit/Notepad works, but VS Code is nicer). Each
entry looks like:

```js
{
  title: "Reworked Denim Jacket",
  kicker: "Fashion piece",
  desc: "Hand-painted and patched denim jacket, one-of-one.",
  image: null,        // <- change this
  accent: "#e07a5f",
},
```

- Drop your image files into `images/clothing/`.
- Change `image: null` to `image: "images/clothing/your-file.jpg"`.
- Update `title`, `kicker`, and `desc` to match.
- Copy/paste a whole block to add more entries — the closet rod lays out
  however many you give it automatically.

Portrait images (e.g. 800×1000) work best. Until you add real images, the
site auto-generates placeholder art so everything still looks intentional,
not broken.

## 3. Where things live in the room

The room itself is your actual `models/room.glb` — whatever's in your
export is what shows up, positioned automatically, including the real vinyl
crate. The closet rod is overlaid separately (see "Your room model" above).

Click a record and the record itself lifts out of the crate while the
camera smoothly zooms into a tight, flattened close-up of the actual cover
— no popup. Click anywhere, press Escape, or use the arrow keys (to flip to
the next/previous record) to control it. Clothing still opens the popup
lightbox since those are flat cards, not real 3D objects.

**Getting around:** WASD walks you through the room, click-and-drag looks
around (you can tilt all the way up to see the ceiling), scroll zooms. It's
not a fixed viewpoint — you can walk anywhere inside the room's bounds.

**The roof, ceiling light, and floor:** your model was built without a
ceiling (so you could see inside it while modeling) and its floor material
had no texture, just a flat color — so the site adds a roof plane (colored
to match your walls' actual pale-yellow tone), a flush-mount ceiling light,
and a generated flecked carpet texture (color + normal map, so it actually
catches light) automatically, all sized to your model's real footprint. The
ceiling light's position is controlled by `CEILING_LIGHT` in `js/room.js`
(fractions of the room, currently near the middle, biased toward the
door/closet side); the carpet tone comes from `FLOOR_BASE_COLOR` in the same
file, sampled from your model's own floor material.

## 4. Tweak the look

- `js/room.js` → `HOTSPOTS.closetRod` controls where the clickable closet
  rod floats in the scene (see "Your room model" above). `CAMERA_START`
  controls where you start (currently the open rug/chair floor area) and
  `CEILING_LIGHT` controls the ceiling fixture position — both are
  fractions (0–1) across the room's real bounding box, tuned from your
  model's actual furniture placement (ladder in the middle, bed on the
  left, door/closet along the back).
- `js/main.js` → camera behavior, lighting, shadows, and the raycasting/
  click logic (including how `Vinyl_N` meshes get found and made clickable).
- `js/loadModel.js` → where `models/room.glb` is loaded from, if you rename
  the file or move it.

### Re-lighting the room with a real Blender bake

Want the softer, more stylized "light baked right into the textures" look
(instead of the current real-time PBR lighting)? See **`BAKING_GUIDE.md`**
— it walks through baking your room's lighting in Blender with the
`blender/bake_lighting.py` script, and the site already knows how to pick
up the result (`js/bakedLook.js`) the moment you drop in the new
`room.glb`. Nothing changes until you do that — the site works exactly as
it does today in the meantime.

## 5. Put it online

Once you're happy with it, the whole folder can be dragged onto:
- **Netlify Drop** (netlify.com/drop) — drag the folder in, get a live link
  instantly, no account needed for a quick test
- **GitHub Pages** — push the folder to a GitHub repo, enable Pages in repo
  settings
- **Vercel** — similar to Netlify, connect a repo or drag-drop

All of these serve static files exactly like your local server does, so no
extra setup is needed.

## Troubleshooting

- **Blank screen / errors in console**: make sure you're running it through
  a local server (step 1), not opening `index.html` directly.
- **Image doesn't show up**: check the file path in `data.js` matches the
  actual file name exactly (including capitalization and extension).
- **Site feels slow**: large image files (multi-MB) can slow things down —
  resize images to roughly 1000px on the long edge before adding them.
