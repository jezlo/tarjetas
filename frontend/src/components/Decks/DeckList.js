import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../services/api';

export default function DeckList() {
  const navigate = useNavigate();
  const [decks, setDecks] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', description: '' });
  const [error, setError] = useState('');

  const load = () => api.get('/decks').then(({ data }) => setDecks(data));

  useEffect(() => { load(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await api.post('/decks', form);
      setForm({ name: '', description: '' });
      setShowForm(false);
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create deck');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this deck?')) return;
    await api.delete(`/decks/${id}`);
    load();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm px-6 py-4 flex justify-between items-center">
        <Link to="/" className="text-2xl font-bold text-indigo-600">Tarjetas</Link>
        <div className="flex items-center gap-4">
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
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-semibold text-gray-800">My Decks</h2>
          <button
            onClick={() => setShowForm(!showForm)}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition text-sm font-medium"
          >
            {showForm ? 'Cancel' : '+ New Deck'}
          </button>
        </div>

        {showForm && (
          <form onSubmit={handleCreate} className="bg-white rounded-xl shadow p-5 mb-6 space-y-3">
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <input
              placeholder="Deck name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
            <input
              placeholder="Description (optional)"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
            <button type="submit" className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition text-sm font-medium">
              Create Deck
            </button>
          </form>
        )}

        {decks.length === 0 ? (
          <div className="bg-white rounded-xl shadow p-8 text-center text-gray-400">
            No decks yet. Create your first one!
          </div>
        ) : (
          <div className="space-y-3">
            {decks.map((deck) => (
              <div key={deck.id} className="bg-white rounded-xl shadow p-5 flex justify-between items-center hover:shadow-md transition">
                <Link to={`/decks/${deck.id}`} className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-800 truncate">{deck.name}</h3>
                  <p className="text-gray-500 text-sm truncate">{deck.description || 'No description'}</p>
                  <p className="text-indigo-600 text-sm mt-1">{deck.card_count} cards</p>
                </Link>
                <button
                  onClick={() => handleDelete(deck.id)}
                  className="ml-4 text-red-400 hover:text-red-600 text-sm"
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
