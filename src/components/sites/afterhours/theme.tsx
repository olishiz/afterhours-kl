"use client";

import { useLayoutEffect } from "react";

export const themeStorageKey = "afterhours-theme";

export type ThemeName = "light" | "dark";

export function readTheme(): ThemeName {
  try {
    const stored = localStorage.getItem(themeStorageKey);
    if (stored === "light" || stored === "dark") return stored;
  } catch {
    /* private mode */
  }
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function applyTheme(theme: ThemeName) {
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
}

export function ThemeBoot() {
  useLayoutEffect(() => {
    applyTheme(readTheme());
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      try {
        const stored = localStorage.getItem(themeStorageKey);
        if (stored === "light" || stored === "dark") return;
      } catch {
        return;
      }
      applyTheme(media.matches ? "dark" : "light");
    };
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  return null;
}
