import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../services/api';

export default function Statistics() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [decks, setDecks] = useState([]);
  const [deckStats, setDeckStats] = useState({});
  const [sessions, setSessions] = useState([]);
  const [loadError, setLoadError] = useState('');

  const loadStats = () => api.get('/statistics').then(({ data }) => setStats(data)).catch(() => setLoadError('Could not load statistics.'));
  const loadSessions = () => api.get('/sessions').then(({ data }) => setSessions(data)).catch(() => {});

  useEffect(() => {
    loadStats();
    api.get('/decks').then(({ data }) => setDecks(data)).catch(() => {});
    loadSessions();
  }, []);

  const loadDeckStats = async (deckId) => {
    if (deckStats[deckId]) return;
    const { data } = await api.get(`/statistics/decks/${deckId}`);
    setDeckStats((prev) => ({ ...prev, [deckId]: data }));
  };

  const handleDeleteSession = async (id) => {
    if (!window.confirm('Delete this study session?')) return;
    try {
      await api.delete(`/sessions/${id}`);
      loadSessions();
    } catch {
      alert('Failed to delete session. Please try again.');
    }
  };

  const handleDeleteAllSessions = async () => {
    if (!window.confirm('Delete all study sessions?')) return;
    try {
      await api.delete('/sessions');
      loadSessions();
    } catch {
      alert('Failed to delete sessions. Please try again.');
    }
  };

  const handleClearStatistics = async () => {
    if (!window.confirm('Clear all statistics? This cannot be undone.')) return;
    try {
      await api.delete('/statistics');
      setDeckStats({});
      loadStats();
    } catch {
      alert('Failed to clear statistics. Please try again.');
    }
  };

  const formatDate = (iso) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleString();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm px-6 py-4 flex justify-between items-center">
        <Link to="/" className="text-2xl font-bold text-indigo-600">Tarjetas</Link>
        <div className="flex items-center gap-4">
          <Link to="/decks" className="text-gray-600 hover:text-indigo-600 font-medium">Decks</Link>
          <button
            onClick={() => { localStorage.removeItem('access_token'); localStorage.removeItem('user'); navigate('/login'); }}
            className="text-sm text-red-500 hover:underline"
          >
            Logout
          </button>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-semibold text-gray-800">Statistics</h2>
          <button
            onClick={handleClearStatistics}
            className="text-sm text-red-500 hover:text-red-700 border border-red-300 rounded-lg px-3 py-1.5 hover:bg-red-50 transition"
          >
            🗑 Clear statistics
          </button>
        </div>

        {loadError && <p className="text-red-500 text-sm mb-4">{loadError}</p>}

        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {[
              { label: 'Total Reviews', value: stats.total_reviews },
              { label: 'Correct', value: stats.correct },
              { label: 'Wrong', value: stats.wrong },
              { label: 'Accuracy', value: `${stats.accuracy}%` },
            ].map(({ label, value }) => (
              <div key={label} className="bg-white rounded-xl shadow p-4 text-center">
                <p className="text-2xl font-bold text-indigo-600">{value}</p>
                <p className="text-sm text-gray-500 mt-1">{label}</p>
              </div>
            ))}
          </div>
        )}

        <h3 className="text-lg font-semibold text-gray-700 mb-4">By Deck</h3>
        {decks.length === 0 ? (
          <p className="text-gray-400">No decks yet.</p>
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
                      <span className="text-xs text-indigo-500">Click to load stats</span>
                    )}
                  </div>
                  {ds && (
                    <div className="grid grid-cols-4 gap-2 mt-3 text-center text-sm">
                      <div>
                        <p className="font-bold text-indigo-600">{ds.total_reviews}</p>
                        <p className="text-gray-500">Reviews</p>
                      </div>
                      <div>
                        <p className="font-bold text-green-600">{ds.correct}</p>
                        <p className="text-gray-500">Correct</p>
                      </div>
                      <div>
                        <p className="font-bold text-red-500">{ds.wrong}</p>
                        <p className="text-gray-500">Wrong</p>
                      </div>
                      <div>
                        <p className="font-bold text-indigo-600">{ds.accuracy}%</p>
                        <p className="text-gray-500">Accuracy</p>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-700">Study Session History</h3>
          {sessions.length > 0 && (
            <button
              onClick={handleDeleteAllSessions}
              className="text-sm text-red-500 hover:text-red-700 border border-red-300 rounded-lg px-3 py-1.5 hover:bg-red-50 transition"
            >
              🗑 Delete all sessions
            </button>
          )}
        </div>
        {sessions.length === 0 ? (
          <p className="text-gray-400">No study sessions recorded yet.</p>
        ) : (
          <div className="space-y-3">
            {sessions.map((s) => {
              const total = s.correct_count + s.wrong_count;
              const accuracy = total ? Math.round((s.correct_count / total) * 100) : 0;
              return (
                <div key={s.id} className="bg-white rounded-xl shadow p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-semibold text-gray-800">{s.deck_name}</p>
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
                    <span className="text-green-600 font-medium">✓ {s.correct_count} correct</span>
                    <span className="text-red-500 font-medium">✗ {s.wrong_count} wrong</span>
                    <span className="text-gray-400">{total} total</span>
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
