import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../services/api';

export default function DeckList() {
  const navigate = useNavigate();
  const [decks, setDecks] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', description: '' });
  const [error, setError] = useState('');

  // Edit deck state
  const [editingDeck, setEditingDeck] = useState(null); // { id, name, description }
  const [editDeckError, setEditDeckError] = useState('');

  // Combine state
  const [showCombine, setShowCombine] = useState(false);
  const [combineSelected, setCombineSelected] = useState([]);
  const [combineName, setCombineName] = useState('');
  const [combineError, setCombineError] = useState('');

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

  const handleEditDeck = async () => {
    setEditDeckError('');
    if (!editingDeck.name.trim()) {
      setEditDeckError('Name cannot be empty');
      return;
    }
    try {
      await api.put(`/decks/${editingDeck.id}`, { name: editingDeck.name.trim(), description: editingDeck.description });
      setEditingDeck(null);
      load();
    } catch (err) {
      setEditDeckError(err.response?.data?.message || 'Failed to update deck');
    }
  };

  const toggleCombineSelect = (id) => {
    setCombineSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleCombine = async (e) => {
    e.preventDefault();
    setCombineError('');
    if (!combineName.trim()) {
      setCombineError('New deck name is required');
      return;
    }
    if (combineSelected.length < 2) {
      setCombineError('Select at least 2 decks to combine');
      return;
    }
    try {
      await api.post('/decks/combine', { name: combineName.trim(), deck_ids: combineSelected });
      setShowCombine(false);
      setCombineSelected([]);
      setCombineName('');
      load();
    } catch (err) {
      setCombineError(err.response?.data?.message || 'Failed to combine decks');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm px-6 py-4 flex justify-between items-center">
        <Link to="/" className="text-2xl font-bold text-indigo-600">Tarjetas</Link>
        <div className="flex items-center gap-4">
          <Link to="/statistics" className="text-gray-600 hover:text-indigo-600 font-medium">Stats</Link>
          <Link to="/browse" className="text-gray-600 hover:text-indigo-600 font-medium">Browse Decks</Link>
          <button
            onClick={() => { localStorage.removeItem('access_token'); localStorage.removeItem('user'); navigate('/login'); }}
            className="text-sm text-red-500 hover:underline"
          >
            Logout
          </button>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-4 py-8">
        <div className="flex flex-wrap justify-between items-center mb-6 gap-2">
          <h2 className="text-2xl font-semibold text-gray-800">My Decks</h2>
          <div className="flex gap-2">
            <button
              onClick={() => { setShowCombine(!showCombine); setCombineSelected([]); setCombineName(''); setCombineError(''); }}
              className="bg-white text-gray-600 border border-gray-300 px-4 py-2 rounded-lg hover:bg-indigo-50 transition text-sm font-medium"
            >
              {showCombine ? 'Cancel Combine' : '⊕ Combine Decks'}
            </button>
            <button
              onClick={() => setShowForm(!showForm)}
              className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition text-sm font-medium"
            >
              {showForm ? 'Cancel' : '+ New Deck'}
            </button>
          </div>
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

        {showCombine && (
          <form onSubmit={handleCombine} className="bg-white rounded-xl shadow p-5 mb-6 space-y-3">
            <h3 className="font-semibold text-gray-800">Combine Decks</h3>
            <p className="text-sm text-gray-500">Select 2 or more decks to merge into a new one. Originals are kept.</p>
            {combineError && <p className="text-red-500 text-sm">{combineError}</p>}
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {decks.map((deck) => (
                <label key={deck.id} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={combineSelected.includes(deck.id)}
                    onChange={() => toggleCombineSelect(deck.id)}
                    className="text-indigo-600"
                  />
                  <span className="text-sm">{deck.name} <span className="text-gray-400">({deck.card_count} cards)</span></span>
                </label>
              ))}
            </div>
            <input
              placeholder="New deck name"
              value={combineName}
              onChange={(e) => setCombineName(e.target.value)}
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
            <button type="submit" className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition text-sm font-medium">
              ⊕ Create Combined Deck
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
              <div key={deck.id} className="bg-white rounded-xl shadow p-5 hover:shadow-md transition">
                {editingDeck && editingDeck.id === deck.id ? (
                  <div className="space-y-2">
                    {editDeckError && <p className="text-red-500 text-sm">{editDeckError}</p>}
                    <input
                      value={editingDeck.name}
                      onChange={(e) => setEditingDeck({ ...editingDeck, name: e.target.value })}
                      onKeyDown={(e) => { if (e.key === 'Enter') handleEditDeck(); if (e.key === 'Escape') setEditingDeck(null); }}
                      autoFocus
                      placeholder="Deck name"
                      className="w-full border border-indigo-400 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    />
                    <input
                      value={editingDeck.description}
                      onChange={(e) => setEditingDeck({ ...editingDeck, description: e.target.value })}
                      placeholder="Description (optional)"
                      className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    />
                    <div className="flex gap-2">
                      <button onClick={handleEditDeck} className="px-3 py-1 text-xs bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition">Save</button>
                      <button onClick={() => { setEditingDeck(null); setEditDeckError(''); }} className="px-3 py-1 text-xs border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-100 transition">Cancel</button>
                    </div>
                  </div>
                ) : (
                  <div className="flex justify-between items-center">
                    <Link to={`/decks/${deck.id}`} className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-800 truncate">{deck.name}</h3>
                      <p className="text-gray-500 text-sm truncate">{deck.description || 'No description'}</p>
                      <p className="text-indigo-600 text-sm mt-1">{deck.card_count} cards</p>
                    </Link>
                    <div className="ml-4 flex gap-3 items-center shrink-0">
                      <button
                        onClick={() => { setEditingDeck({ id: deck.id, name: deck.name, description: deck.description || '' }); setEditDeckError(''); }}
                        className="text-xs text-indigo-500 hover:text-indigo-700"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(deck.id)}
                        className="text-xs text-red-400 hover:text-red-600"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
