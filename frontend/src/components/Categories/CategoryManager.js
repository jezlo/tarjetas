import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../services/api';

export default function CategoryManager() {
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [decks, setDecks] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [createError, setCreateError] = useState('');
  const [editingCategory, setEditingCategory] = useState(null); // { id, name }
  const [editError, setEditError] = useState('');

  const load = async () => {
    const [catRes, deckRes] = await Promise.all([
      api.get('/categories'),
      api.get('/decks'),
    ]);
    setCategories(catRes.data);
    setDecks(deckRes.data);
  };

  useEffect(() => { load(); }, []);

  const deckCountForCategory = (category) => {
    if (category.name === 'General') return decks.length;
    return decks.filter((d) => d.category_id === category.id).length;
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setCreateError('');
    const name = newName.trim();
    if (!name) { setCreateError('Name is required'); return; }
    try {
      await api.post('/categories', { name });
      setNewName('');
      setShowForm(false);
      load();
    } catch (err) {
      setCreateError(err.response?.data?.message || 'Failed to create category');
    }
  };

  const handleEdit = async () => {
    setEditError('');
    const name = editingCategory.name.trim();
    if (!name) { setEditError('Name cannot be empty'); return; }
    try {
      await api.put(`/categories/${editingCategory.id}`, { name });
      setEditingCategory(null);
      load();
    } catch (err) {
      setEditError(err.response?.data?.message || 'Failed to update category');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this category? Its decks will be moved to "Sin Categoría".')) return;
    try {
      await api.delete(`/categories/${id}`);
      load();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete category');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm px-6 py-4 flex justify-between items-center">
        <Link to="/" className="text-2xl font-bold text-indigo-600">Tarjetas</Link>
        <div className="flex items-center gap-4">
          <Link to="/decks" className="text-gray-600 hover:text-indigo-600 font-medium">Decks</Link>
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

      <main className="max-w-2xl mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-semibold text-gray-800">Categories</h2>
          <button
            onClick={() => { setShowForm(!showForm); setNewName(''); setCreateError(''); }}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition text-sm font-medium"
          >
            {showForm ? 'Cancel' : '+ New Category'}
          </button>
        </div>

        {showForm && (
          <form onSubmit={handleCreate} className="bg-white rounded-xl shadow p-5 mb-6 space-y-3">
            {createError && <p className="text-red-500 text-sm">{createError}</p>}
            <input
              placeholder="Category name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              autoFocus
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
            <button type="submit" className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition text-sm font-medium">
              Create Category
            </button>
          </form>
        )}

        <div className="space-y-3">
          {categories.map((cat) => (
            <div key={cat.id} className="bg-white rounded-xl shadow p-4">
              {editingCategory && editingCategory.id === cat.id ? (
                <div className="space-y-2">
                  {editError && <p className="text-red-500 text-sm">{editError}</p>}
                  <input
                    value={editingCategory.name}
                    onChange={(e) => setEditingCategory({ ...editingCategory, name: e.target.value })}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleEdit(); if (e.key === 'Escape') setEditingCategory(null); }}
                    autoFocus
                    className="w-full border border-indigo-400 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  />
                  <div className="flex gap-2">
                    <button onClick={handleEdit} className="px-3 py-1 text-xs bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition">Save</button>
                    <button onClick={() => { setEditingCategory(null); setEditError(''); }} className="px-3 py-1 text-xs border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-100 transition">Cancel</button>
                  </div>
                </div>
              ) : (
                <div className="flex justify-between items-center">
                  <div>
                    <span className="font-medium text-gray-800">{cat.name}</span>
                    {cat.is_default && (
                      <span className="ml-2 text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">default</span>
                    )}
                    <p className="text-sm text-indigo-600 mt-0.5">{deckCountForCategory(cat)} decks</p>
                  </div>
                  {!cat.is_default && (
                    <div className="flex gap-3">
                      <button
                        onClick={() => { setEditingCategory({ id: cat.id, name: cat.name }); setEditError(''); }}
                        className="text-xs text-indigo-500 hover:text-indigo-700"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(cat.id)}
                        className="text-xs text-red-400 hover:text-red-600"
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}

          {categories.length === 0 && (
            <div className="bg-white rounded-xl shadow p-8 text-center text-gray-400">
              No categories yet. Create your first one!
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
