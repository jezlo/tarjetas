import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { useTranslation } from '../../hooks/useTranslation';
import Navbar from '../Navbar';

export default function DeckList() {
  const { t } = useTranslation();
  const [decks, setDecks] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState(null); // null = show all
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', category_id: '' });
  const [error, setError] = useState('');

  // Edit deck state
  const [editingDeck, setEditingDeck] = useState(null); // { id, name, description, category_id }
  const [editDeckError, setEditDeckError] = useState('');

  // Combine state
  const [showCombine, setShowCombine] = useState(false);
  const [combineSelected, setCombineSelected] = useState([]);
  const [combineName, setCombineName] = useState('');
  const [combineCardFilter, setCombineCardFilter] = useState('all');
  const [combineError, setCombineError] = useState('');

  const load = async () => {
    const [decksRes, catsRes] = await Promise.all([
      api.get('/decks'),
      api.get('/categories'),
    ]);
    setDecks(decksRes.data);
    setCategories(catsRes.data);
  };

  useEffect(() => { load(); }, []);

  // When categories load, default form category to "Sin Categoría"
  useEffect(() => {
    if (categories.length > 0) {
      const sinCat = categories.find((c) => c.name === 'Sin Categoría');
      if (sinCat) setForm((f) => f.category_id ? f : { ...f, category_id: sinCat.id });
    }
  }, [categories]);

  const sinCategoryId = categories.find((c) => c.name === 'Sin Categoría')?.id;
  const generalCategoryId = categories.find((c) => c.name === 'General')?.id;

  const getCategoryName = (categoryId) => {
    const cat = categories.find((c) => c.id === categoryId);
    return cat ? cat.name : '';
  };

  const deckCountForCategory = (cat) => {
    if (cat.name === 'General') return decks.length;
    return decks.filter((d) => d.category_id === cat.id).length;
  };

  const filteredDecks = selectedCategoryId === null
    ? decks
    : selectedCategoryId === generalCategoryId
      ? decks
      : decks.filter((d) => d.category_id === selectedCategoryId);

  const handleCreate = async (e) => {
    e.preventDefault();
    setError('');
    let deckId;
    try {
      const res = await api.post('/decks', { name: form.name, description: form.description });
      deckId = res.data.id;
    } catch (err) {
      setError(err.response?.data?.message || t('decks.failedCreate'));
      return;
    }
    // Assign category if not default "Sin Categoría"
    if (form.category_id && form.category_id !== sinCategoryId) {
      try {
        await api.put(`/categories/${form.category_id}/decks/${deckId}`);
      } catch {
        setError(t('decks.categoryDeckCreated'));
      }
    }
    setForm({ name: '', description: '', category_id: sinCategoryId || '' });
    setShowForm(false);
    load();
  };

  const handleDelete = async (id) => {
    if (!window.confirm(t('decks.deleteConfirm'))) return;
    await api.delete(`/decks/${id}`);
    load();
  };

  const handleEditDeck = async () => {
    setEditDeckError('');
    if (!editingDeck.name.trim()) {
      setEditDeckError(t('decks.nameRequired'));
      return;
    }
    try {
      await api.put(`/decks/${editingDeck.id}`, { name: editingDeck.name.trim(), description: editingDeck.description });
    } catch (err) {
      setEditDeckError(err.response?.data?.message || t('decks.failedUpdate'));
      return;
    }
    // Update category assignment
    if (editingDeck.category_id) {
      try {
        await api.put(`/categories/${editingDeck.category_id}/decks/${editingDeck.id}`);
      } catch {
        setEditDeckError(t('decks.categoryDeckUpdated'));
      }
    }
    setEditingDeck(null);
    load();
  };

  const handleToggleShare = async (id) => {
    try {
      const { data } = await api.put(`/decks/${id}/share`);
      setDecks((prev) => prev.map((d) => (d.id === id ? { ...d, is_public: data.is_public } : d)));
    } catch {
      // silently ignore - state stays unchanged
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
      setCombineError(t('decks.newNameRequired'));
      return;
    }
    if (combineSelected.length < 2) {
      setCombineError(t('decks.selectAtLeast2'));
      return;
    }
    try {
      await api.post('/decks/combine', { name: combineName.trim(), deck_ids: combineSelected, card_filter: combineCardFilter });
      setShowCombine(false);
      setCombineSelected([]);
      setCombineName('');
      setCombineCardFilter('all');
      load();
    } catch (err) {
      setCombineError(err.response?.data?.message || t('decks.failedCombine'));
    }
  };

  // Non-default categories (user-created)
  const userCategories = categories.filter((c) => !c.is_default);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <Navbar />

      <div className="max-w-5xl mx-auto px-4 py-8 flex flex-col md:flex-row gap-6">
        {/* Category Sidebar */}
        <aside className="w-full md:w-48 md:shrink-0">
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow p-4 md:sticky md:top-8">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 uppercase tracking-wide">{t('decks.categories')}</h3>
              <Link to="/categories" className="text-xs text-indigo-500 hover:text-indigo-700">{t('decks.manage')}</Link>
            </div>
            <ul className="space-y-1">
              <li>
                <button
                  onClick={() => setSelectedCategoryId(null)}
                  className={`w-full text-left px-2 py-1.5 rounded-lg text-sm flex justify-between items-center transition ${
                    selectedCategoryId === null
                      ? 'bg-indigo-50 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 font-medium'
                      : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                  }`}
                >
                  <span>{t('decks.allDecks')}</span>
                  <span className={`text-xs ${selectedCategoryId === null ? 'text-indigo-500 dark:text-indigo-400' : 'text-gray-400 dark:text-gray-500'}`}>{decks.length}</span>
                </button>
              </li>
              {categories
                .filter((c) => c.name !== 'General')
                .map((cat) => (
                  <li key={cat.id}>
                    <button
                      onClick={() => setSelectedCategoryId(cat.id)}
                      className={`w-full text-left px-2 py-1.5 rounded-lg text-sm flex justify-between items-center transition ${
                        selectedCategoryId === cat.id
                          ? 'bg-indigo-50 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 font-medium'
                          : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                      }`}
                    >
                      <span className="truncate mr-1">{cat.name}</span>
                      <span className={`text-xs shrink-0 ${selectedCategoryId === cat.id ? 'text-indigo-500 dark:text-indigo-400' : 'text-gray-400 dark:text-gray-500'}`}>
                        {deckCountForCategory(cat)}
                      </span>
                    </button>
                  </li>
                ))}
            </ul>
            {userCategories.length === 0 && (
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-2 text-center">
                <Link to="/categories" className="hover:underline">{t('decks.addCategories')}</Link>
              </p>
            )}
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 min-w-0">
          <div className="flex flex-wrap justify-between items-center mb-6 gap-2">
            <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-100">
              {selectedCategoryId === null
                ? t('decks.myDecks')
                : getCategoryName(selectedCategoryId)}
            </h2>
            <div className="flex gap-2">
              <button
                onClick={() => { setShowCombine(!showCombine); setCombineSelected([]); setCombineName(''); setCombineCardFilter('all'); setCombineError(''); }}
                className="bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-300 dark:border-gray-600 px-4 py-2 rounded-lg hover:bg-indigo-50 dark:hover:bg-gray-700 transition text-sm font-medium"
              >
                {showCombine ? t('decks.cancelCombine') : t('decks.combineDecks')}
              </button>
              <button
                onClick={() => setShowForm(!showForm)}
                className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition text-sm font-medium"
              >
                {showForm ? t('common.cancel') : t('decks.newDeck')}
              </button>
            </div>
          </div>

          {showForm && (
            <form onSubmit={handleCreate} className="bg-white dark:bg-gray-900 rounded-xl shadow p-5 mb-6 space-y-3">
              {error && <p className="text-red-500 text-sm">{error}</p>}
              <input
                placeholder={t('decks.deckName')}
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
                className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
              <input
                placeholder={t('decks.description')}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
              {categories.length > 0 && (
                <select
                  value={form.category_id}
                  onChange={(e) => setForm({ ...form, category_id: Number(e.target.value) })}
                  className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                >
                  {categories
                    .filter((c) => c.name !== 'General')
                    .map((cat) => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                </select>
              )}
              <button type="submit" className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition text-sm font-medium">
                {t('decks.createDeck')}
              </button>
            </form>
          )}

          {showCombine && (
            <form onSubmit={handleCombine} className="bg-white dark:bg-gray-900 rounded-xl shadow p-5 mb-6 space-y-3">
              <h3 className="font-semibold text-gray-800 dark:text-gray-100">{t('decks.combineTitle')}</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">{t('decks.combineDesc')}</p>
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
                    <span className="text-sm dark:text-gray-300">{deck.name} <span className="text-gray-400 dark:text-gray-500">({deck.card_count} {t('common.cards')})</span></span>
                  </label>
                ))}
              </div>
              <input
                placeholder={t('decks.newDeckName')}
                value={combineName}
                onChange={(e) => setCombineName(e.target.value)}
                required
                className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
              <div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('decks.cardFilter')}</p>
                <div className="flex flex-wrap gap-4">
                  {['all', 'difficult', 'known'].map((filter) => (
                    <label key={filter} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="combineCardFilter"
                        value={filter}
                        checked={combineCardFilter === filter}
                        onChange={() => setCombineCardFilter(filter)}
                        className="text-indigo-600"
                      />
                      <span className="text-sm dark:text-gray-300">{t(`decks.cardFilter_${filter}`)}</span>
                    </label>
                  ))}
                </div>
              </div>
              <button type="submit" className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition text-sm font-medium">
                {t('decks.createCombined')}
              </button>
            </form>
          )}

          {filteredDecks.length === 0 ? (
            <div className="bg-white dark:bg-gray-900 rounded-xl shadow p-8 text-center text-gray-400 dark:text-gray-500">
              {selectedCategoryId === null
                ? t('decks.noDecks')
                : t('decks.noDecksInCategory')}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredDecks.map((deck) => (
                <div key={deck.id} className="bg-white dark:bg-gray-900 rounded-xl shadow p-5 hover:shadow-md transition">
                  {editingDeck && editingDeck.id === deck.id ? (
                    <div className="space-y-2">
                      {editDeckError && <p className="text-red-500 text-sm">{editDeckError}</p>}
                      <input
                        value={editingDeck.name}
                        onChange={(e) => setEditingDeck({ ...editingDeck, name: e.target.value })}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleEditDeck(); if (e.key === 'Escape') setEditingDeck(null); }}
                        autoFocus
                        placeholder={t('decks.deckName')}
                        className="w-full border border-indigo-400 dark:border-indigo-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                      />
                      <input
                        value={editingDeck.description}
                        onChange={(e) => setEditingDeck({ ...editingDeck, description: e.target.value })}
                        placeholder={t('decks.description')}
                        className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                      />
                      {categories.length > 0 && (
                        <select
                          value={editingDeck.category_id || ''}
                          onChange={(e) => setEditingDeck({ ...editingDeck, category_id: Number(e.target.value) })}
                          className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                        >
                          {categories
                            .filter((c) => c.name !== 'General')
                            .map((cat) => (
                              <option key={cat.id} value={cat.id}>{cat.name}</option>
                            ))}
                        </select>
                      )}
                      <div className="flex gap-2">
                        <button onClick={handleEditDeck} className="px-3 py-1 text-xs bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition">{t('common.save')}</button>
                        <button onClick={() => { setEditingDeck(null); setEditDeckError(''); }} className="px-3 py-1 text-xs border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition">{t('common.cancel')}</button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex justify-between items-center">
                      <Link to={`/decks/${deck.id}`} className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-800 dark:text-gray-100 truncate">{deck.name}</h3>
                        <p className="text-gray-500 dark:text-gray-400 text-sm truncate">{deck.description || t('common.noDescription')}</p>
                        <div className="flex items-center gap-3 mt-1">
                          <p className="text-indigo-600 text-sm">{deck.card_count} {t('common.cards')}</p>
                          {(() => {
                            const catName = getCategoryName(deck.category_id);
                            return catName && catName !== 'Sin Categoría' ? (
                              <span className="text-xs bg-indigo-50 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-300 px-2 py-0.5 rounded-full">
                                {catName}
                              </span>
                            ) : null;
                          })()}
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            deck.is_public
                              ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                              : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
                          }`}>
                            {deck.is_public ? t('deckDetail.public') : t('deckDetail.private')}
                          </span>
                        </div>
                      </Link>
                      <div className="ml-4 flex gap-3 items-center shrink-0">
                        <button
                          onClick={() => handleToggleShare(deck.id)}
                          className={`text-xs px-2 py-0.5 rounded-full border font-medium transition ${
                            deck.is_public
                              ? 'border-green-300 text-green-700 hover:bg-green-50 dark:border-green-700 dark:text-green-300 dark:hover:bg-green-900'
                              : 'border-gray-300 text-gray-500 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-800'
                          }`}
                        >
                          {deck.is_public ? t('deckDetail.public') : t('deckDetail.private')}
                        </button>
                        <button
                          onClick={() => { setEditingDeck({ id: deck.id, name: deck.name, description: deck.description || '', category_id: deck.category_id || sinCategoryId || null }); setEditDeckError(''); }}
                          className="text-xs text-indigo-500 hover:text-indigo-700"
                        >
                          {t('common.edit')}
                        </button>
                        <button
                          onClick={() => handleDelete(deck.id)}
                          className="text-xs text-red-400 hover:text-red-600"
                        >
                          {t('common.delete')}
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
    </div>
  );
}
