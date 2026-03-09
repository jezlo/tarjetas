import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { getCurrentUser } from '../../utils/authUtils';
import { useTranslation } from '../../hooks/useTranslation';
import Navbar from '../Navbar';

export default function Dashboard() {
  const { t } = useTranslation();
  const user = getCurrentUser();
  const [stats, setStats] = useState(null);
  const [recentDecks, setRecentDecks] = useState([]);
  const [mostUsedDecks, setMostUsedDecks] = useState([]);
  const [activeTab, setActiveTab] = useState('recent');
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    api.get('/statistics').then(({ data }) => setStats(data)).catch(() => setLoadError(t('dashboard.loadError')));
    api.get('/decks').then(({ data }) => setRecentDecks(data.slice(0, 4))).catch(() => {});
    api.get('/decks/most-used').then(({ data }) => setMostUsedDecks(data)).catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const displayedDecks = activeTab === 'recent' ? recentDecks : mostUsedDecks;
  const emptyKey = activeTab === 'recent' ? 'dashboard.noDecks' : 'dashboard.noUsedDecks';

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <Navbar />

      <main className="max-w-4xl mx-auto px-4 py-8">
        <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-100 mb-2">
          {t('dashboard.welcomeBack', { name: user.username })}
        </h2>
        <p className="text-gray-500 dark:text-gray-400 mb-8">{t('dashboard.readyToStudy')}</p>

        {loadError && <p className="text-red-500 text-sm mb-4">{loadError}</p>}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {[
              { label: t('dashboard.totalReviews'), value: stats.total_reviews },
              { label: t('dashboard.correct'), value: stats.correct },
              { label: t('dashboard.wrong'), value: stats.wrong },
              { label: t('dashboard.accuracy'), value: `${stats.accuracy}%` },
            ].map(({ label, value }) => (
              <div key={label} className="bg-white dark:bg-gray-900 rounded-xl shadow p-4 text-center">
                <p className="text-2xl font-bold text-indigo-600">{value}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{label}</p>
              </div>
            ))}
          </div>
        )}

        <div className="flex justify-between items-center mb-4">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('recent')}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition ${
                activeTab === 'recent'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              {t('dashboard.recentDecks')}
            </button>
            <button
              onClick={() => setActiveTab('mostUsed')}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition ${
                activeTab === 'mostUsed'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              {t('dashboard.mostUsedDecks')}
            </button>
          </div>
          <Link to="/decks" className="text-indigo-600 text-sm hover:underline">{t('dashboard.viewAll')}</Link>
        </div>

        {displayedDecks.length === 0 ? (
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow p-8 text-center text-gray-400 dark:text-gray-500">
            {t(emptyKey)}{' '}
            {activeTab === 'recent' && (
              <Link to="/decks" className="text-indigo-600 hover:underline">{t('dashboard.createFirst')}</Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {displayedDecks.map((deck) => (
              <Link
                key={deck.id}
                to={`/decks/${deck.id}`}
                className="bg-white dark:bg-gray-900 rounded-xl shadow p-5 hover:shadow-md transition block"
              >
                <h4 className="font-semibold text-gray-800 dark:text-gray-100">{deck.name}</h4>
                <p className="text-gray-500 dark:text-gray-400 text-sm mt-1 truncate">{deck.description || t('common.noDescription')}</p>
                <p className="text-indigo-600 text-sm mt-2">{deck.card_count} {t('common.cards')}</p>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
