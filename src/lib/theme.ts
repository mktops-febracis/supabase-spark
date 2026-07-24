import { useEffect, useState } from "react";

export type Theme = "light" | "dark";

export const THEME_KEY = "febracis-email-builder:theme";

/** Script inline injetado no <head>/<body> para aplicar o tema antes da 1ª pintura (anti-flash). */
export const THEME_INIT_SCRIPT = `try{if(localStorage.getItem('${THEME_KEY}')==='dark'){document.documentElement.classList.add('dark')}}catch(e){}`;

function readStored(): Theme {
  try {
    return localStorage.getItem(THEME_KEY) === "dark" ? "dark" : "light";
  } catch {
    return "light";
  }
}

function apply(theme: Theme) {
  document.documentElement.classList.toggle("dark", theme === "dark");
}

/**
 * Tema da INTERFACE do app (não afeta o preview do e-mail nem a HTML exportada —
 * o preview é um iframe isolado com HTML próprio).
 */
export function useTheme() {
  const [theme, setTheme] = useState<Theme>("light");

  // No mount (client), sincroniza o estado com o que o script anti-flash já aplicou.
  useEffect(() => {
    setTheme(readStored());
  }, []);

  function toggle() {
    setTheme((prev) => {
      const next: Theme = prev === "dark" ? "light" : "dark";
      apply(next);
      try {
        localStorage.setItem(THEME_KEY, next);
      } catch {
        /* localStorage indisponível — não é fatal */
      }
      return next;
    });
  }

  return { theme, toggle };
}
