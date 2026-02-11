
const initTheme = () => {
  const theme = (() => {
    if (typeof localStorage !== 'undefined' && localStorage.getItem('theme')) {
      return localStorage.getItem('theme');
    }
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
    return 'light';
  })();

  if (theme === 'light') {
    document.documentElement.classList.remove('dark', 'mocha');
    document.documentElement.classList.add('frappe');
  } else {
    document.documentElement.classList.remove('frappe');
    document.documentElement.classList.add('dark', 'mocha');
  }

  window.localStorage.setItem('theme', theme);
};

const handleToggleClick = () => {
  const element = document.documentElement;
  const isDark = !element.classList.contains('dark');

  if (isDark) {
    element.classList.remove('frappe');
    element.classList.add('dark', 'mocha');
  } else {
    element.classList.remove('dark', 'mocha');
    element.classList.add('frappe');
  }

  localStorage.setItem('theme', isDark ? 'dark' : 'light');
};

// Initialize theme on page load
initTheme();

// Re-run initialization when document is shown again (view transitions)
document.addEventListener('astro:after-swap', initTheme);

// Setup click listener
document.addEventListener('astro:page-load', () => {
  document
    .getElementById('themeToggle')
    ?.addEventListener('click', handleToggleClick);
});
