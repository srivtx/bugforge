"use client";
import { useEffect, useState } from "react";

export type Theme = "light" | "dark";

export function currentTheme(): Theme {
  if (typeof document === "undefined") return "light";
  const forced = document.documentElement.dataset.theme;
  if (forced === "light" || forced === "dark") return forced;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function setTheme(t: Theme) {
  document.documentElement.dataset.theme = t;
  try {
    localStorage.setItem("bugforge.theme", t);
  } catch {
    /* ignore */
  }
}

export function useTheme(): Theme {
  const [t, setT] = useState<Theme>("light");
  useEffect(() => {
    setT(currentTheme());
    const obs = new MutationObserver(() => setT(currentTheme()));
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onMq = () => setT(currentTheme());
    mq.addEventListener("change", onMq);
    return () => {
      obs.disconnect();
      mq.removeEventListener("change", onMq);
    };
  }, []);
  return t;
}

// runs before paint to avoid a flash of the wrong theme
export const themeScript = `(function(){try{var t=localStorage.getItem('bugforge.theme');if(t==='light'||t==='dark')document.documentElement.dataset.theme=t;}catch(e){}})();`;
