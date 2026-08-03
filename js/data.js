// ============================================================================
// THIS IS THE FILE YOU EDIT TO ADD YOUR OWN WORK.
// ============================================================================
//
// CLOTHING (fashion pieces, shown hanging on the closet rod) is the one list
// that's actually used — edit it to add real pieces.
//
// VINYL_COVERS below is unused now: your vinyl crate is real geometry inside
// models/room.glb (the Vinyl_1..Vinyl_20 meshes), with real cover art baked
// on as textures, so main.js reads the art straight from the model instead
// of from this file. Left here in case you want a data-driven fallback again.
//
// For each CLOTHING entry you can EITHER:
//   1) leave "image: null"  -> a generated placeholder is used automatically
//   2) set "image: 'images/clothing/my-piece.jpg'" -> put a real image file
//      in that folder and it will be used instead. Portrait images work
//      best (e.g. 800x1000).
//
// You can add as many entries as you want, the closet rod will lay them out
// automatically. Just copy a block below and change the values.
// ============================================================================

export const VINYL_COVERS = [
  {
    title: "Late Night Drive",
    kicker: "Album cover",
    desc: "Cover art for a late-night synth record. Swap this text and image for your real release.",
    image: null,
    accent: "#ff6b6b",
  },
  {
    title: "Static Bloom",
    kicker: "Single artwork",
    desc: "Single cover, mixed-media collage style.",
    image: null,
    accent: "#5bc0be",
  },
  {
    title: "Neon Interior",
    kicker: "EP artwork",
    desc: "3-track EP cover, gradient + type experiment.",
    image: null,
    accent: "#ffce6b",
  },
  {
    title: "Paper Moon",
    kicker: "Album cover",
    desc: "Full-length cover, illustration-based.",
    image: null,
    accent: "#c792ea",
  },
  {
    title: "Slow Static",
    kicker: "Single artwork",
    desc: "Minimal type-driven cover for a stripped-back single.",
    image: null,
    accent: "#8ecae6",
  },
  {
    title: "Field Notes",
    kicker: "Mixtape cover",
    desc: "Scrapbook-style mixtape art, torn paper texture.",
    image: null,
    accent: "#ffb4a2",
  },
];

export const CLOTHING = [
  {
    title: "Reworked Denim Jacket",
    kicker: "Fashion piece",
    desc: "Hand-painted and patched denim jacket, one-of-one.",
    image: null,
    accent: "#e07a5f",
  },
  {
    title: "Tour Tee Concept",
    kicker: "Merch design",
    desc: "Graphic concept for a band's tour merch run.",
    image: null,
    accent: "#3d5a80",
  },
  {
    title: "Patchwork Flare",
    kicker: "Fashion piece",
    desc: "Upcycled patchwork trousers, mixed fabric scraps.",
    image: null,
    accent: "#ee9b00",
  },
  {
    title: "Studio Hoodie",
    kicker: "Merch design",
    desc: "Embroidered hoodie design for the studio drop.",
    image: null,
    accent: "#94d2bd",
  },
  {
    title: "Silk Scarf Print",
    kicker: "Textile design",
    desc: "Printed scarf pattern, hand-drawn repeat motif.",
    image: null,
    accent: "#bb9af7",
  },
];

// Room mood / color palette — tweak these to re-theme the whole room quickly.
export const PALETTE = {
  wall: "#2b2430",
  wallShadow: "#211b26",
  floor: "#8a5a3b",
  wood: "#6b4226",
  woodLight: "#8a6240",
  fabric: "#d97757",
  accentWarm: "#ffce6b",
  accentCool: "#8ecae6",
  rug: "#f2ece2",
};
