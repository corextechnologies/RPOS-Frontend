"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

type Theme = "light" | "dark";

interface ThemeContextValue {
  theme: Theme;
  /** False until after the first client paint. Theme-dependent UI should treat
   *  the theme as unknown until this flips, to avoid hydration mismatches. */
  mounted: boolean;
  toggle: () => void;
  setTheme: (t: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

const STORAGE_KEY = "rpos-theme";

function readTheme(): Theme {
  if (typeof window === "undefined") return "light";
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(readTheme);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // The pre-hydration inline script already set the theme class on <html>;
    // sync React state to it and flag that client-only UI can now render.
    setThemeState(readTheme());
    setMounted(true);
    const root = document.documentElement;
    requestAnimationFrame(() => root.classList.add("theme-ready"));
  }, []);

  const apply = useCallback((next: Theme) => {
    const root = document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {}
    setThemeState(next);
  }, []);

  const toggle = useCallback(
    () => apply(theme === "dark" ? "light" : "dark"),
    [theme, apply],
  );

  return (
    <ThemeContext.Provider value={{ theme, mounted, toggle, setTheme: apply }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
