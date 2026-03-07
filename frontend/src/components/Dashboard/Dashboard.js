import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../services/api';

export default function Dashboard() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const [stats, setStats] = useState(null);
  const [recentDecks, setRecentDecks] = useState([]);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    api.get('/statistics').then(({ data }) => setStats(data)).catch(() => setLoadError('Could not load statistics.'));
    api.get('/decks').then(({ data }) => setRecentDecks(data.slice(0, 4))).catch(() => {});
  }, []);

  const logout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm px-6 py-4 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-indigo-600">Tarjetas</h1>
        <div className="flex items-center gap-4">
          <Link to="/decks" className="text-gray-600 hover:text-indigo-600 font-medium">Decks</Link>
          <Link to="/browse" className="text-gray-600 hover:text-indigo-600 font-medium">Browse Decks</Link>
          <Link to="/statistics" className="text-gray-600 hover:text-indigo-600 font-medium">Stats</Link>
          {user.is_admin && (
            <Link to="/admin" className="text-gray-600 hover:text-indigo-600 font-medium">Admin</Link>
          )}
          <button onClick={logout} className="text-sm text-red-500 hover:underline">Logout</button>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <h2 className="text-2xl font-semibold text-gray-800 mb-2">
          Welcome back, {user.username}!
        </h2>
        <p className="text-gray-500 mb-8">Ready to study?</p>

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

        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-700">Recent Decks</h3>
          <Link to="/decks" className="text-indigo-600 text-sm hover:underline">View all →</Link>
        </div>

        {recentDecks.length === 0 ? (
          <div className="bg-white rounded-xl shadow p-8 text-center text-gray-400">
            No decks yet.{' '}
            <Link to="/decks" className="text-indigo-600 hover:underline">Create your first deck</Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {recentDecks.map((deck) => (
              <Link
                key={deck.id}
                to={`/decks/${deck.id}`}
                className="bg-white rounded-xl shadow p-5 hover:shadow-md transition block"
              >
                <h4 className="font-semibold text-gray-800">{deck.name}</h4>
                <p className="text-gray-500 text-sm mt-1 truncate">{deck.description || 'No description'}</p>
                <p className="text-indigo-600 text-sm mt-2">{deck.card_count} cards</p>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
