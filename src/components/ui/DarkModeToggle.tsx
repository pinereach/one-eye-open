import { useEffect, useState } from 'react';

export function DarkModeToggle() {
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    const isDark = document.documentElement.classList.contains('dark');
    setDarkMode(isDark);
  }, []);

  function toggleDarkMode() {
    const newDark = !darkMode;
    setDarkMode(newDark);
    if (newDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('darkMode', 'true');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('darkMode', 'false');
    }
  }

  useEffect(() => {
    const stored = localStorage.getItem('darkMode');
    if (stored === 'true') {
      document.documentElement.classList.add('dark');
      setDarkMode(true);
    }
  }, []);

  return (
    <button
      onClick={toggleDarkMode}
      className="p-2 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 touch-manipulation min-h-[44px] min-w-[44px] flex items-center justify-center leading-none"
      aria-label="Toggle dark mode"
    >
      {darkMode ? '☀️' : '🌙'}
    </button>
  );
}
