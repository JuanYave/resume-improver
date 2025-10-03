'use client';

import { Sun, Moon, Languages } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';

export default function Header() {
  const { uiLanguage, setUILanguage, theme, setTheme } = useApp();

  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  };

  const toggleLanguage = () => {
    setUILanguage(uiLanguage === 'es' ? 'en' : 'es');
  };

  return (
    <div className="fixed top-4 right-4 z-50 flex items-center gap-3">
      {/* Language Toggle */}
      <button
        onClick={toggleLanguage}
        className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm hover:shadow-md transition-all text-gray-700 dark:text-gray-200"
        title={uiLanguage === 'es' ? 'Switch to English' : 'Cambiar a Español'}
      >
        <Languages className="w-4 h-4" />
        <span className="text-sm font-medium">{uiLanguage === 'es' ? 'EN' : 'ES'}</span>
      </button>

      {/* Theme Toggle */}
      <button
        onClick={toggleTheme}
        className="flex items-center justify-center w-10 h-10 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm hover:shadow-md transition-all text-gray-700 dark:text-gray-200"
        title={theme === 'light' ? 'Dark mode' : 'Light mode'}
      >
        {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
      </button>
    </div>
  );
}
