import React, { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { useTranslation } from '../../hooks/useTranslation';

export default function BrowseDecks() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [decks, setDecks] = useState([]);
  const [importing, setImporting] = useState(null);
  const [liking, setLiking] = useState(null);
  const [message, setMessage] = useState('');
  const [sortBy, setSortBy] = useState('recent');

  const fetchDecks = useCallback((sort) => {
    api.get(`/decks/public/list?sort=${sort}`).then(({ data }) => setDecks(data));
  }, []);

  useEffect(() => {
    fetchDecks(sortBy);
  }, [sortBy, fetchDecks]);

  const handleImport = async (deckId) => {
    setImporting(deckId);
    setMessage('');
    try {
      const { data } = await api.post(`/decks/import/${deckId}`);
      setMessage(t('browse.importSuccess', { name: data.name }));
      setDecks((prev) =>
        prev.map((d) => (d.id === deckId ? { ...d, already_imported: true, import_count: d.import_count + 1 } : d))
      );
    } catch (err) {
      setMessage(t('browse.importFail'));
    } finally {
      setImporting(null);
    }
  };

  const handleLike = async (deckId) => {
    setLiking(deckId);
    try {
      const { data } = await api.post(`/decks/${deckId}/like`);
      setDecks((prev) =>
        prev.map((d) =>
          d.id === deckId ? { ...d, user_has_liked: data.liked, like_count: data.like_count } : d
        )
      );
    } catch (err) {
      setMessage(t('browse.likeFail'));
    } finally {
      setLiking(null);
    }
  };

  // Detect success message for styling (works in both languages)
  const isSuccess = message && (message.includes('successfully') || message.includes('correctamente'));

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm px-6 py-4 flex justify-between items-center">
        <Link to="/" className="text-2xl font-bold text-indigo-600">{t('app.name')}</Link>
        <div className="flex items-center gap-4">
          <Link to="/decks" className="text-gray-600 hover:text-indigo-600 font-medium">{t('nav.myDecks')}</Link>
          <Link to="/statistics" className="text-gray-600 hover:text-indigo-600 font-medium">{t('nav.stats')}</Link>
          <Link to="/prompts" className="text-gray-600 hover:text-indigo-600 font-medium">{t('nav.prompts')}</Link>
          <button
            onClick={() => { localStorage.removeItem('access_token'); localStorage.removeItem('user'); navigate('/login'); }}
            className="text-sm text-red-500 hover:underline"
          >
            {t('nav.logout')}
          </button>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-semibold text-gray-800">{t('browse.title')}</h2>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500 mr-1">{t('browse.sort')}</span>
            <button
              onClick={() => setSortBy('recent')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${sortBy === 'recent' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-50'}`}
            >
              {t('browse.mostRecent')}
            </button>
            <button
              onClick={() => setSortBy('popular')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${sortBy === 'popular' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-50'}`}
            >
              {t('browse.mostPopular')}
            </button>
          </div>
        </div>

        {message && (
          <div className={`mb-4 p-3 rounded-lg text-sm font-medium ${isSuccess ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
            {message}
          </div>
        )}

        {decks.length === 0 ? (
          <div className="bg-white rounded-xl shadow p-8 text-center text-gray-400">
            {t('browse.noDecks')}
          </div>
        ) : (
          <div className="space-y-3">
            {decks.map((deck) => (
              <div key={deck.id} className="bg-white rounded-xl shadow p-5 flex justify-between items-center hover:shadow-md transition">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-gray-800 truncate">{deck.name}</h3>
                    {deck.is_own && (
                      <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-medium">{t('browse.yours')}</span>
                    )}
                    {!deck.is_own && deck.already_imported && (
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">{t('browse.alreadyImported')}</span>
                    )}
                  </div>
                  <p className="text-gray-500 text-sm truncate">{deck.description || t('common.noDescription')}</p>
                  <p className="text-indigo-600 text-sm mt-1">
                    {deck.card_count} {t('common.cards')} · {t('browse.by')} {deck.owner_username}
                    <span className="text-gray-400 ml-2">· {deck.import_count} {deck.import_count === 1 ? t('browse.import') : t('browse.imports')}</span>
                  </p>
                </div>
                <div className="ml-4 flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => handleLike(deck.id)}
                    disabled={liking === deck.id}
                    title={deck.user_has_liked ? 'Unlike this deck' : 'Like this deck'}
                    className={`flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium transition ${deck.user_has_liked ? 'bg-pink-100 text-pink-600 hover:bg-pink-200' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'} disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    <span>{deck.user_has_liked ? '❤️' : '🤍'}</span>
                    <span>{deck.like_count}</span>
                  </button>
                  <button
                    onClick={() => handleImport(deck.id)}
                    disabled={importing === deck.id || deck.is_own || deck.already_imported}
                    title={deck.is_own ? 'This is your own deck' : deck.already_imported ? 'Already imported' : 'Import this deck'}
                    className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {importing === deck.id ? t('browse.importing') : deck.is_own ? t('browse.own') : deck.already_imported ? t('browse.imported') : t('browse.importBtn')}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
