/**
 * Light and dark mode. Dark mode is the brand's ink theme, set as
 * data-theme="dark" on <html>. The visitor's system setting decides until
 * they choose with the toggle; the choice is a functional cookie (no
 * consent needed), read before the first paint so no page flashes.
 */
export const THEME_COOKIE = "sal_theme";

export type Theme = "light" | "dark";

/**
 * Runs in <head> before the page paints. Follows the system setting while no
 * choice is stored, and prints in light (paper).
 */
export const themeScript = `(function(){try{var d=document.documentElement,m=matchMedia("(prefers-color-scheme: dark)");var s=function(){var c=/(?:^|; )${THEME_COOKIE}=(light|dark)/.exec(document.cookie);d.dataset.theme=c?c[1]:m.matches?"dark":"light"};s();m.addEventListener("change",s);addEventListener("beforeprint",function(){d.dataset.theme="light"});addEventListener("afterprint",s)}catch(e){}})()`;

/** Stores the visitor's choice for a year and applies it at once. */
export const chooseTheme = (theme: Theme) => {
  // biome-ignore lint/suspicious/noDocumentCookie: a plain functional cookie
  document.cookie = `${THEME_COOKIE}=${theme}; path=/; max-age=31536000; samesite=lax`;
  document.documentElement.dataset.theme = theme;
};

export const currentTheme = (): Theme =>
  document.documentElement.dataset.theme === "dark" ? "dark" : "light";
