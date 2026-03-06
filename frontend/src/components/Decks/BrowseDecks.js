import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../services/api';

export default function BrowseDecks() {
  const navigate = useNavigate();
  const [decks, setDecks] = useState([]);
  const [importing, setImporting] = useState(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    api.get('/decks/public/list').then(({ data }) => setDecks(data));
  }, []);

  const handleImport = async (deckId) => {
    setImporting(deckId);
    setMessage('');
    try {
      const { data } = await api.post(`/decks/import/${deckId}`);
      setMessage(`Deck "${data.name}" imported successfully!`);
    } catch (err) {
      setMessage('Failed to import deck. Please try again.');
    } finally {
      setImporting(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm px-6 py-4 flex justify-between items-center">
        <Link to="/" className="text-2xl font-bold text-indigo-600">Tarjetas</Link>
        <div className="flex items-center gap-4">
          <Link to="/decks" className="text-gray-600 hover:text-indigo-600 font-medium">My Decks</Link>
          <Link to="/statistics" className="text-gray-600 hover:text-indigo-600 font-medium">Stats</Link>
          <button
            onClick={() => { localStorage.removeItem('access_token'); localStorage.removeItem('user'); navigate('/login'); }}
            className="text-sm text-red-500 hover:underline"
          >
            Logout
          </button>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-4 py-8">
        <h2 className="text-2xl font-semibold text-gray-800 mb-6">Browse Public Decks</h2>

        {message && (
          <div className={`mb-4 p-3 rounded-lg text-sm font-medium ${message.includes('successfully') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
            {message}
          </div>
        )}

        {decks.length === 0 ? (
          <div className="bg-white rounded-xl shadow p-8 text-center text-gray-400">
            No public decks available yet.
          </div>
        ) : (
          <div className="space-y-3">
            {decks.map((deck) => (
              <div key={deck.id} className="bg-white rounded-xl shadow p-5 flex justify-between items-center hover:shadow-md transition">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-800 truncate">{deck.name}</h3>
                  <p className="text-gray-500 text-sm truncate">{deck.description || 'No description'}</p>
                  <p className="text-indigo-600 text-sm mt-1">{deck.card_count} cards · by {deck.owner_username}</p>
                </div>
                <button
                  onClick={() => handleImport(deck.id)}
                  disabled={importing === deck.id}
                  className="ml-4 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition disabled:opacity-50"
                >
                  {importing === deck.id ? 'Importing…' : 'Import'}
                </button>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
