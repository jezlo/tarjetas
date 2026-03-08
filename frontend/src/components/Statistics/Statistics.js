import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { useTranslation } from '../../hooks/useTranslation';
import { formatDateWithTimezone } from '../../utils/dateUtils';

export default function Statistics() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [stats, setStats] = useState(null);
  const [decks, setDecks] = useState([]);
  const [deckStats, setDeckStats] = useState({});
  const [sessions, setSessions] = useState([]);
  const [loadError, setLoadError] = useState('');
  const [timezone, setTimezone] = useState('UTC');

  const loadStats = () => api.get('/statistics').then(({ data }) => setStats(data)).catch(() => setLoadError(t('stats.loadError')));
  const loadSessions = () => api.get('/sessions').then(({ data }) => setSessions(data)).catch(() => {});

  useEffect(() => {
    loadStats();
    api.get('/decks').then(({ data }) => setDecks(data)).catch(() => {});
    loadSessions();
    api.get('/admin/public-settings')
      .then(({ data }) => { if (data.timezone) setTimezone(data.timezone); })
      .catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const loadDeckStats = async (deckId) => {
    if (deckStats[deckId]) return;
    const { data } = await api.get(`/statistics/decks/${deckId}`);
    setDeckStats((prev) => ({ ...prev, [deckId]: data }));
  };

  const handleDeleteSession = async (id) => {
    if (!window.confirm(t('stats.deleteSessionConfirm'))) return;
    try {
      await api.delete(`/sessions/${id}`);
      loadSessions();
    } catch {
      alert(t('stats.failedDelete'));
    }
  };

  const handleDeleteAllSessions = async () => {
    if (!window.confirm(t('stats.deleteAllConfirm'))) return;
    try {
      await api.delete('/sessions');
      loadSessions();
    } catch {
      alert(t('stats.failedDeleteAll'));
    }
  };

  const handleClearStatistics = async () => {
    if (!window.confirm(t('stats.clearConfirm'))) return;
    try {
      await api.delete('/statistics');
      setDeckStats({});
      loadStats();
    } catch {
      alert(t('stats.failedClear'));
    }
  };

  const formatDate = (iso) => formatDateWithTimezone(iso, timezone);

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm px-6 py-4 flex justify-between items-center">
        <Link to="/" className="text-2xl font-bold text-indigo-600">{t('app.name')}</Link>
        <div className="flex items-center gap-4">
          <Link to="/decks" className="text-gray-600 hover:text-indigo-600 font-medium">{t('nav.decks')}</Link>
          <button
            onClick={() => { localStorage.removeItem('access_token'); localStorage.removeItem('user'); navigate('/login'); }}
            className="text-sm text-red-500 hover:underline"
          >
            {t('nav.logout')}
          </button>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-semibold text-gray-800">{t('stats.title')}</h2>
          <button
            onClick={handleClearStatistics}
            className="text-sm text-red-500 hover:text-red-700 border border-red-300 rounded-lg px-3 py-1.5 hover:bg-red-50 transition"
          >
            {t('stats.clearStatistics')}
          </button>
        </div>

        {loadError && <p className="text-red-500 text-sm mb-4">{loadError}</p>}

        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {[
              { label: t('stats.totalReviews'), value: stats.total_reviews },
              { label: t('stats.correct'), value: stats.correct },
              { label: t('stats.wrong'), value: stats.wrong },
              { label: t('stats.accuracy'), value: `${stats.accuracy}%` },
            ].map(({ label, value }) => (
              <div key={label} className="bg-white rounded-xl shadow p-4 text-center">
                <p className="text-2xl font-bold text-indigo-600">{value}</p>
                <p className="text-sm text-gray-500 mt-1">{label}</p>
              </div>
            ))}
          </div>
        )}

        <h3 className="text-lg font-semibold text-gray-700 mb-4">{t('stats.byDeck')}</h3>
        {decks.length === 0 ? (
          <p className="text-gray-400">{t('stats.noDecks')}</p>
        ) : (
          <div className="space-y-3 mb-8">
            {decks.map((deck) => {
              const ds = deckStats[deck.id];
              return (
                <div
                  key={deck.id}
                  className="bg-white rounded-xl shadow p-4 cursor-pointer hover:shadow-md transition"
                  onClick={() => loadDeckStats(deck.id)}
                >
                  <div className="flex justify-between items-center">
                    <h4 className="font-semibold text-gray-800">{deck.name}</h4>
                    {!ds && (
                      <span className="text-xs text-indigo-500">{t('stats.clickToLoad')}</span>
                    )}
                  </div>
                  {ds && (
                    <div className="grid grid-cols-4 gap-2 mt-3 text-center text-sm">
                      <div>
                        <p className="font-bold text-indigo-600">{ds.total_reviews}</p>
                        <p className="text-gray-500">{t('stats.reviews')}</p>
                      </div>
                      <div>
                        <p className="font-bold text-green-600">{ds.correct}</p>
                        <p className="text-gray-500">{t('stats.correct')}</p>
                      </div>
                      <div>
                        <p className="font-bold text-red-500">{ds.wrong}</p>
                        <p className="text-gray-500">{t('stats.wrong')}</p>
                      </div>
                      <div>
                        <p className="font-bold text-indigo-600">{ds.accuracy}%</p>
                        <p className="text-gray-500">{t('stats.accuracy')}</p>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-700">{t('stats.sessions')}</h3>
          {sessions.length > 0 && (
            <button
              onClick={handleDeleteAllSessions}
              className="text-sm text-red-500 hover:text-red-700 border border-red-300 rounded-lg px-3 py-1.5 hover:bg-red-50 transition"
            >
              {t('stats.deleteAllSessions')}
            </button>
          )}
        </div>
        {sessions.length === 0 ? (
          <p className="text-gray-400">{t('stats.noSessions')}</p>
        ) : (
          <div className="space-y-3">
            {sessions.map((s) => {
              const total = s.correct_count + s.wrong_count;
              const accuracy = total ? Math.round((s.correct_count / total) * 100) : 0;
              const sessionTypeLabel = t(`stats.sessionTypes.${s.session_type}`);
              const sessionTypeBadgeColors = {
                trivia: 'bg-yellow-100 text-yellow-700',
                fill: 'bg-green-100 text-green-700',
                study: 'bg-indigo-100 text-indigo-700',
              };
              const sessionTypeBadgeColor = sessionTypeBadgeColors[s.session_type] || sessionTypeBadgeColors.study;
              return (
                <div key={s.id} className="bg-white rounded-xl shadow p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-gray-800">{s.deck_name}</p>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${sessionTypeBadgeColor}`}>
                          {sessionTypeLabel}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">{formatDate(s.started_at)}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-bold text-indigo-600">{accuracy}%</span>
                      <button
                        onClick={() => handleDeleteSession(s.id)}
                        className="text-xs text-red-400 hover:text-red-600"
                        title="Delete session"
                      >
                        🗑
                      </button>
                    </div>
                  </div>
                  <div className="flex gap-4 mt-3 text-sm">
                    <span className="text-green-600 font-medium">{t('stats.correctCount', { n: s.correct_count })}</span>
                    <span className="text-red-500 font-medium">{t('stats.wrongCount', { n: s.wrong_count })}</span>
                    <span className="text-gray-400">{t('stats.total', { n: total })}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
