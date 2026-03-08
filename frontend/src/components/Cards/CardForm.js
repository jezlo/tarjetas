import React, { useState } from 'react';
import api from '../../services/api';
import { useTranslation } from '../../hooks/useTranslation';

export default function CardForm({ deckId, onSaved }) {
  const { t } = useTranslation();
  const [form, setForm] = useState({ question: '', answer: '', context: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.post(`/decks/${deckId}/cards`, form);
      setForm({ question: '', answer: '', context: '' });
      onSaved();
    } catch (err) {
      setError(err.response?.data?.message || t('card.failedSave'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow p-6 max-w-lg mx-auto">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">{t('card.addNew')}</h3>
      {error && <p className="text-red-500 text-sm mb-3">{error}</p>}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t('card.question')}</label>
          <textarea
            value={form.question}
            onChange={(e) => setForm({ ...form, question: e.target.value })}
            required
            rows={3}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t('card.answer')}</label>
          <textarea
            value={form.answer}
            onChange={(e) => setForm({ ...form, answer: e.target.value })}
            required
            rows={3}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Context <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          <textarea
            value={form.context}
            onChange={(e) => setForm({ ...form, context: e.target.value })}
            rows={2}
            placeholder={t('card.contextPlaceholder')}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-indigo-600 text-white py-2 rounded-lg font-semibold hover:bg-indigo-700 disabled:opacity-50 transition"
        >
          {loading ? t('card.saving') : t('card.addCard')}
        </button>
      </form>
    </div>
  );
}
