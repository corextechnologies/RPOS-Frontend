/** Inline script injected before hydration to set theme class on <html> (no flash). */
export const themeInitScript = `
(function () {
  try {
    var stored = localStorage.getItem('rpos-theme');
    var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    var theme = stored || (prefersDark ? 'dark' : 'light');
    var root = document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(theme);
  } catch (e) {}
})();
`;
