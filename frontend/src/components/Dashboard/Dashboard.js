import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { getCurrentUser } from '../../utils/authUtils';
import { useTranslation } from '../../hooks/useTranslation';

export default function Dashboard() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const user = getCurrentUser();
  const [stats, setStats] = useState(null);
  const [recentDecks, setRecentDecks] = useState([]);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    api.get('/statistics').then(({ data }) => setStats(data)).catch(() => setLoadError(t('dashboard.loadError')));
    api.get('/decks').then(({ data }) => setRecentDecks(data.slice(0, 4))).catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const logout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm px-6 py-4 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-indigo-600">{t('app.name')}</h1>
        <div className="flex items-center gap-4">
          <Link to="/decks" className="text-gray-600 hover:text-indigo-600 font-medium">{t('nav.decks')}</Link>
          <Link to="/browse" className="text-gray-600 hover:text-indigo-600 font-medium">{t('nav.browse')}</Link>
          <Link to="/statistics" className="text-gray-600 hover:text-indigo-600 font-medium">{t('nav.stats')}</Link>
          <Link to="/prompts" className="text-gray-600 hover:text-indigo-600 font-medium">{t('nav.prompts')}</Link>
          <Link to="/profile" className="text-gray-600 hover:text-indigo-600 font-medium">{t('nav.profile')}</Link>
          {user.is_admin && (
            <Link to="/admin" className="text-gray-600 hover:text-indigo-600 font-medium">{t('nav.admin')}</Link>
          )}
          <button onClick={logout} className="text-sm text-red-500 hover:underline">{t('nav.logout')}</button>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <h2 className="text-2xl font-semibold text-gray-800 mb-2">
          {t('dashboard.welcomeBack', { name: user.username })}
        </h2>
        <p className="text-gray-500 mb-8">{t('dashboard.readyToStudy')}</p>

        {loadError && <p className="text-red-500 text-sm mb-4">{loadError}</p>}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {[
              { label: t('dashboard.totalReviews'), value: stats.total_reviews },
              { label: t('dashboard.correct'), value: stats.correct },
              { label: t('dashboard.wrong'), value: stats.wrong },
              { label: t('dashboard.accuracy'), value: `${stats.accuracy}%` },
            ].map(({ label, value }) => (
              <div key={label} className="bg-white rounded-xl shadow p-4 text-center">
                <p className="text-2xl font-bold text-indigo-600">{value}</p>
                <p className="text-sm text-gray-500 mt-1">{label}</p>
              </div>
            ))}
          </div>
        )}

        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-700">{t('dashboard.recentDecks')}</h3>
          <Link to="/decks" className="text-indigo-600 text-sm hover:underline">{t('dashboard.viewAll')}</Link>
        </div>

        {recentDecks.length === 0 ? (
          <div className="bg-white rounded-xl shadow p-8 text-center text-gray-400">
            {t('dashboard.noDecks')}{' '}
            <Link to="/decks" className="text-indigo-600 hover:underline">{t('dashboard.createFirst')}</Link>
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
                <p className="text-gray-500 text-sm mt-1 truncate">{deck.description || t('common.noDescription')}</p>
                <p className="text-indigo-600 text-sm mt-2">{deck.card_count} {t('common.cards')}</p>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
