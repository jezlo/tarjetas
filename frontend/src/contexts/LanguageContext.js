import React, { createContext, useContext, useState, useEffect } from 'react';
import en from '../locales/en.json';
import es from '../locales/es.json';

const LanguageContext = createContext(null);

const STORAGE_KEY = 'app_language';
const SUPPORTED_LANGUAGES = ['es', 'en'];
const DEFAULT_LANGUAGE = 'es';

/**
 * LanguageProvider wraps the app and makes the current language available
 * throughout the component tree via useLanguage().
 *
 * Language preference is persisted in localStorage so that it survives page
 * reloads. When a user updates their language via the profile page it is also
 * saved to the database through the profile API endpoint.
 *
 * ### Adding a new language
 * 1. Create a new translation file in `frontend/src/locales/<code>.json`
 *    following the structure of `en.json` / `es.json`.
 * 2. Import it in this file and add it to the `translations` map below.
 * 3. Add the language code to the `SUPPORTED_LANGUAGES` array.
 * 4. Add a human-readable label for it in the UserProfile language selector.
 */

const translations = { en, es };

function getInitialLanguage() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored && SUPPORTED_LANGUAGES.includes(stored)) return stored;

  // Fall back to user object stored after login
  try {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (user.language && SUPPORTED_LANGUAGES.includes(user.language)) {
      return user.language;
    }
  } catch (_) {}

  return DEFAULT_LANGUAGE;
}

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState(getInitialLanguage);

  const setLanguage = (lang) => {
    if (!SUPPORTED_LANGUAGES.includes(lang)) return;
    setLanguageState(lang);
    localStorage.setItem(STORAGE_KEY, lang);
  };

  // When the stored user object changes (e.g. after login), sync language
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      try {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        if (user.language && SUPPORTED_LANGUAGES.includes(user.language)) {
          setLanguageState(user.language);
        }
      } catch (_) {}
    }
  }, []);

  const value = {
    language,
    setLanguage,
    translations: translations[language] || translations[DEFAULT_LANGUAGE],
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used inside a LanguageProvider');
  return ctx;
}
