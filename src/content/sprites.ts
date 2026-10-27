// Pixel sprites for the home page and the 404 page. "." is empty; other characters index the palette.
import type { Sprite } from "@/lib/pixelfield";

/** Builds a symmetric sprite from its left half (the middle column is not repeated). */
const mirror = (half: string[]) => half.map((r) => r + [...r].reverse().join(""));

const INK = "#17151c";

// Glitch: the sleepy BugForge bug. Flat-top eyes, red nose, orange split shell.
export const bug: Sprite = {
  rows: mirror([
    "...K....",
    "....K...",
    ".....KKK",
    "....KKKK",
    "...KKKKK",
    "..KKKKKK",
    "..KWKWKK",
    "K.KKWKKK",
    ".KKKKKKK",
    "..KKKKKR",
    "KKKOOOOK",
    "..KOOYOK",
    ".KKOOOOK",
    "K.KOOOOK",
    "...KOOOK",
    "..K.KKKK",
    ".K......",
  ]),
  palette: { K: INK, W: "#ffffff", R: "#ff2d3d", O: "#ff7a1a", Y: "#ffb21f" },
};

export const wrench: Sprite = {
  rows: [
    "..........KKK...",
    ".........KWWK...",
    "........KWWK..K.",
    "........KWWK.KWK",
    "........KWWWKWWK",
    ".......KWWWWWWK.",
    "......KWWWWWKK..",
    ".....KWWWKKK....",
    "....KWWWK.......",
    "...KWWWK........",
    "..KBBBK.........",
    ".KBBBK..........",
    "KBBBK...........",
    "KBBK............",
    ".KK.............",
  ],
  palette: { K: INK, W: "#cfe3ee", B: "#2f6bff" },
};

// A bubbling potion: the thing you brew in a build lab.
export const potion: Sprite = {
  // highlight on the left only
  rows: mirror([
    "......KK",
    ".....KRR",
    "......KR",
    "....KKKK",
    ".....KLL",
    ".....KLL",
    "....KLLL",
    "...KLLLL",
    "..KLLLLL",
    ".KLLOOOO",
    ".KLOHOOO",
    ".KLOHHOO",
    ".KLOOOOO",
    "..KLOOOO",
    "...KLLLL",
    "....KKKK",
  ]).map((r) => r.slice(0, 8) + r.slice(8).replace(/H/g, "O")),
  palette: { K: INK, R: "#e8262c", L: "#cdeef6", O: "#ff4a1c", H: "#ffc2b3" },
  sparks: [
    { x: 6, y: -0.5, c: "#ff4a1c" },
    { x: 9, y: -1, c: "#ff4a1c" },
    { x: 7, y: -1.5, c: "#ffb21f" },
    { x: 10, y: 0, c: "#ff4a1c" },
    { x: 5, y: -1, c: "#ffb21f" },
  ],
};
