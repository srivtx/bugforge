"use client";
// Local-only progress store (localStorage) with a tiny subscribe API for React.
import { useSyncExternalStore } from "react";

export type ItemStatus = "solved" | "attempted";

export interface Progress {
  labs: Record<string, { status: ItemStatus; bestMs?: number; runs: number; at: number }>;
  problems: Record<string, { status: ItemStatus; runs: number; at: number; lang?: string }>;
  drills: Record<string, { correct: boolean; at: number }>;
  hunts: { played: number; solved: number; bestStreak: number; streak: number; fastestMs?: number; mutations: Record<string, number> };
  activity: Record<string, number>; // yyyy-mm-dd -> count
  exercises: Record<string, { status: ItemStatus; hints: number; runs: number; xp: number; at: number }>; // "lesson/id"
  lessonsRead: Record<string, number>; // slug -> first read time
}

const KEY = "bugforge.progress.v1";
const empty: Progress = { labs: {}, problems: {}, drills: {}, hunts: { played: 0, solved: 0, bestStreak: 0, streak: 0, mutations: {} }, activity: {}, exercises: {}, lessonsRead: {} };

let state: Progress = empty;
let loaded = false;
const listeners = new Set<() => void>();

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      state = { ...empty, ...parsed, hunts: { ...empty.hunts, ...(parsed.hunts || {}) } };
    }
  } catch {
    state = empty;
  }
}

function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* storage unavailable: keep in memory */
  }
  listeners.forEach((l) => l());
}

export function today() {
  return new Date().toISOString().slice(0, 10);
}

export function update(fn: (p: Progress) => Progress) {
  load();
  state = fn(state);
  state = { ...state, activity: { ...state.activity, [today()]: (state.activity[today()] || 0) + 1 } };
  save();
}

export function getProgress() {
  load();
  return state;
}

export function useProgress(): Progress {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => getProgress(),
    () => empty,
  );
}

// draft code persistence
export function loadDraft<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem("bugforge.draft." + key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}
export function saveDraft(key: string, value: unknown) {
  try {
    localStorage.setItem("bugforge.draft." + key, JSON.stringify(value));
  } catch {
    /* ignore */
  }
}
export function clearDraft(key: string) {
  try {
    localStorage.removeItem("bugforge.draft." + key);
  } catch {
    /* ignore */
  }
}
