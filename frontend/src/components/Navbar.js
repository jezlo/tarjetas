import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { getCurrentUser } from '../utils/authUtils';
import { useTranslation } from '../hooks/useTranslation';
import { useTheme } from '../contexts/ThemeContext';

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const user = getCurrentUser();
  const [menuOpen, setMenuOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();

  const logout = () => {
    setMenuOpen(false);
    localStorage.removeItem('access_token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const navLinks = [
    { to: '/decks', label: t('nav.decks') },
    { to: '/browse', label: t('nav.browse') },
    { to: '/statistics', label: t('nav.stats') },
    { to: '/prompts', label: t('nav.prompts') },
    { to: '/profile', label: t('nav.profile') },
    ...(user?.is_admin ? [{ to: '/admin', label: t('nav.admin') }] : []),
  ];

  const isActive = (path) => location.pathname === path;

  const linkClass = (to) =>
    `font-medium transition-colors ${isActive(to) ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400'}`;

  return (
    <nav className="bg-white dark:bg-gray-900 shadow-sm">
      <div className="px-6 py-4 flex justify-between items-center">
        <Link to="/" className="text-2xl font-bold text-indigo-600 dark:text-indigo-400 shrink-0">
          {t('app.name')}
        </Link>

        {/* Desktop navigation */}
        <div className="hidden md:flex items-center gap-4">
          {navLinks.map(({ to, label }) => (
            <Link key={to} to={to} className={linkClass(to)}>
              {label}
            </Link>
          ))}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg text-gray-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            aria-label={theme === 'dark' ? t('nav.lightMode') : t('nav.darkMode')}
            title={theme === 'dark' ? t('nav.lightMode') : t('nav.darkMode')}
          >
            {theme === 'dark' ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            )}
          </button>
          <button onClick={logout} className="text-sm text-red-500 hover:underline">
            {t('nav.logout')}
          </button>
        </div>

        {/* Hamburger button - mobile only */}
        <button
          className="md:hidden p-2 rounded-lg text-gray-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle navigation menu"
          aria-expanded={menuOpen}
        >
          {menuOpen ? (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>
      </div>

      {/* Mobile dropdown menu */}
      {menuOpen && (
        <div className="md:hidden border-t border-gray-100 dark:border-gray-700 px-6 py-3 flex flex-col gap-1 bg-white dark:bg-gray-900">
          {navLinks.map(({ to, label }) => (
            <Link
              key={to}
              to={to}
              onClick={() => setMenuOpen(false)}
              className={`py-2 ${linkClass(to)}`}
            >
              {label}
            </Link>
          ))}
          <button
            onClick={() => { toggleTheme(); setMenuOpen(false); }}
            className="py-2 text-sm text-gray-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 text-left flex items-center gap-2"
          >
            {theme === 'dark' ? (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
                {t('nav.lightMode')}
              </>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
                {t('nav.darkMode')}
              </>
            )}
          </button>
          <button
            onClick={logout}
            className="py-2 text-sm text-red-500 hover:underline text-left"
          >
            {t('nav.logout')}
          </button>
        </div>
      )}
    </nav>
  );
}
