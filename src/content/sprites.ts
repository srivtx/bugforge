// Pixel sprites for the home page and the 404 page. "." is empty; other characters index the palette.
import type { Sprite } from "@/lib/pixelfield";

/** Builds a symmetric sprite from its left half (the middle column is not repeated). */
const mirror = (half: string[]) => half.map((r) => r + [...r].reverse().join(""));

// Warm, softened palette so sprites sit on the paper cards instead of shouting over them.
const INK = "#3b342f";
const PAPER = "#fbf7f0";

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
  palette: { K: INK, W: PAPER, R: "#df6a60", O: "#eb9a5e", Y: "#f3c978" },
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
  palette: { K: INK, W: "#dde8eb", B: "#7f97d6" },
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
  palette: { K: INK, R: "#d9675f", L: "#e1eef0", O: "#e98a66", H: "#f6d4c8" },
  sparks: [
    { x: 6, y: -0.5, c: "#e98a66" },
    { x: 9, y: -1, c: "#e98a66" },
    { x: 7, y: -1.5, c: "#f3c978" },
    { x: 10, y: 0, c: "#e98a66" },
    { x: 5, y: -1, c: "#f3c978" },
  ],
};

// Spot the Bug: a lightning bolt, for speed drills.
export const bolt: Sprite = {
  rows: [
    ".......KKKKK",
    "......KYYYK.",
    ".....KYYYK..",
    "....KYYYK...",
    "...KYYYK....",
    "..KYYYYKKKK.",
    ".KYYYYYYYYK.",
    ".KKKKKYYYK..",
    ".....KYYK...",
    "....KYYK....",
    "...KYYK.....",
    "...KYK......",
    "..KYK.......",
    "..KK........",
  ],
  palette: { K: INK, Y: "#f2cf74" },
};

// DSA: a tiny binary tree.
export const tree: Sprite = {
  rows: [
    ".....KKKK.....",
    "....KVVVVK....",
    "....KVWVVK....",
    "....KVVVVK....",
    ".....KKKK.....",
    "....K....K....",
    "...K......K...",
    "..K........K..",
    ".KKKK....KKKK.",
    "KMMMMK..KMMMMK",
    "KMWMMK..KMWMMK",
    "KMMMMK..KMMMMK",
    ".KKKK....KKKK.",
  ],
  palette: { K: INK, V: "#9d92df", M: "#78b99a", W: PAPER },
};

// Learn: an open book.
export const book: Sprite = {
  rows: [
    ".KKKKKK..KKKKKK.",
    "KWWWWWWKKWWWWWWK",
    "KWKKKWWKKWKKKWWK",
    "KWWWWWWKKWWWWWWK",
    "KWKKKKWKKWKKKKWK",
    "KWWWWWWKKWWWWWWK",
    "KWKKKWWKKWKKWWWK",
    "KWWWWWWKKWWWWWWK",
    "KRRRRRRKKRRRRRRK",
    ".KKKKKKKKKKKKKK.",
  ],
  palette: { K: INK, W: PAPER, R: "#eb9a5e" },
};
