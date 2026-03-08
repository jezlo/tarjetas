import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../services/api';

const SessionPreferencesContext = createContext(null);

const STORAGE_KEY = 'session_preferences';

const DEFAULT_PREFERENCES = {
  session_type: 'study',
  num_cards: 'all',
  shuffle: false,
  invert_cards: false,
  hide_known: false,
  auto_flip_delay: 0,
  fill_weak_mode: false,
  fill_show_char_count: false,
  include_fill_cards: false,
  fill_card_percentage: 20,
  trivia_option_count: 3,
};

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...DEFAULT_PREFERENCES, ...JSON.parse(raw) };
  } catch (_) {}
  return { ...DEFAULT_PREFERENCES };
}

export function SessionPreferencesProvider({ children }) {
  const [preferences, setPreferences] = useState(loadFromStorage);

  // On mount, attempt to load preferences from the API (requires auth)
  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (!token) return;
    api.get('/preferences')
      .then(({ data }) => {
        if (data && typeof data === 'object' && Object.keys(data).length > 0) {
          const merged = { ...DEFAULT_PREFERENCES, ...data };
          setPreferences(merged);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
        }
      })
      .catch((err) => {
        // API unavailable – localStorage fallback already loaded
        console.debug('Could not load session preferences from server:', err?.message);
      });
  }, []);

  const updatePreferences = useCallback((updates) => {
    setPreferences((prev) => {
      const next = { ...prev, ...updates };
      // Persist to localStorage immediately
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      // Sync to backend asynchronously
      api.post('/preferences', next).catch(() => {});
      return next;
    });
  }, []);

  const value = { preferences, updatePreferences };

  return (
    <SessionPreferencesContext.Provider value={value}>
      {children}
    </SessionPreferencesContext.Provider>
  );
}

export function useSessionPreferences() {
  const ctx = useContext(SessionPreferencesContext);
  if (!ctx) throw new Error('useSessionPreferences must be used inside a SessionPreferencesProvider');
  return ctx;
}
