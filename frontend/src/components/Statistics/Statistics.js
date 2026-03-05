import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../services/api';

export default function Statistics() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [decks, setDecks] = useState([]);
  const [deckStats, setDeckStats] = useState({});
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    api.get('/statistics').then(({ data }) => setStats(data)).catch(() => setLoadError('Could not load statistics.'));
    api.get('/decks').then(({ data }) => setDecks(data)).catch(() => {});
  }, []);

  const loadDeckStats = async (deckId) => {
    if (deckStats[deckId]) return;
    const { data } = await api.get(`/statistics/decks/${deckId}`);
    setDeckStats((prev) => ({ ...prev, [deckId]: data }));
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
        <h2 className="text-2xl font-semibold text-gray-800 mb-6">Statistics</h2>

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
          <div className="space-y-3">
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
      </main>
    </div>
  );
}
