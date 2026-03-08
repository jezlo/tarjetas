import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { getCurrentUser } from '../utils/authUtils';
import { useTranslation } from '../hooks/useTranslation';

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const user = getCurrentUser();
  const [menuOpen, setMenuOpen] = useState(false);

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
    `font-medium transition-colors ${isActive(to) ? 'text-indigo-600' : 'text-gray-600 hover:text-indigo-600'}`;

  return (
    <nav className="bg-white shadow-sm">
      <div className="px-6 py-4 flex justify-between items-center">
        <Link to="/" className="text-2xl font-bold text-indigo-600 shrink-0">
          {t('app.name')}
        </Link>

        {/* Desktop navigation */}
        <div className="hidden md:flex items-center gap-4">
          {navLinks.map(({ to, label }) => (
            <Link key={to} to={to} className={linkClass(to)}>
              {label}
            </Link>
          ))}
          <button onClick={logout} className="text-sm text-red-500 hover:underline">
            {t('nav.logout')}
          </button>
        </div>

        {/* Hamburger button - mobile only */}
        <button
          className="md:hidden p-2 rounded-lg text-gray-600 hover:text-indigo-600 hover:bg-gray-100 transition-colors"
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
        <div className="md:hidden border-t border-gray-100 px-6 py-3 flex flex-col gap-1">
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
