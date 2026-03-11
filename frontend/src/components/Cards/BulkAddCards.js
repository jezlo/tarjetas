import React, { useState } from 'react';
import api from '../../services/api';
import { useTranslation } from '../../hooks/useTranslation';

export default function BulkAddCards({ deckId, onSaved }) {
  const { t } = useTranslation();
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const splitByComa = (line) => {
    const parts = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
        current += char;
      } else if (char === ',' && !inQuotes) {
        parts.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    parts.push(current);
    return parts;
  };

  const parseCards = (raw) => {
    return raw
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .map((line) => {
        const parts = splitByComa(line);
        if (parts.length < 2) return null;
        const question = parts[0].trim().replace(/^"|"$/g, '');
        const answer = parts[1].trim().replace(/^"|"$/g, '');
        const context = parts.length > 2 ? parts[2].trim().replace(/^"|"$/g, '') : undefined;
        return question && answer ? { question, answer, ...(context ? { context } : {}) } : null;
      })
      .filter(Boolean);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    const cards = parseCards(text);
    if (cards.length === 0) {
      setError(t('bulk.noValid'));
      return;
    }

    setLoading(true);
    try {
      await Promise.all(cards.map((card) => api.post(`/decks/${deckId}/cards`, card)));
      setMessage(t('bulk.success', { n: cards.length }));
      setText('');
      onSaved();
    } catch (err) {
      setError(err.response?.data?.message || t('bulk.failed'));
    } finally {
      setLoading(false);
    }
  };

  const parsedCards = parseCards(text);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6 max-w-2xl mx-auto">
      <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-2">{t('bulk.title')}</h3>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
        {t('bulk.desc')}{' '}
        <code className="bg-gray-100 dark:bg-gray-700 dark:text-gray-300 px-1 rounded">{t('bulk.format')}</code>
        {' '}— {t('bulk.contextOptional', { context: 'context' })}
      </p>
      {error && <p className="text-red-500 text-sm mb-3">{error}</p>}
      {message && <p className="text-green-600 text-sm mb-3">{message}</p>}
      <form onSubmit={handleSubmit} className="space-y-4">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={12}
          placeholder={"What is the capital of France?, Paris, Largest city in France\nWhat is 2+2?, 4\nWho wrote Hamlet?, Shakespeare, Written around 1600"}
          className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:focus:ring-indigo-300"
        />
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-400 dark:text-gray-500">
            {t('bulk.detected', { n: parsedCards.length })}
          </span>
          <button
            type="submit"
            disabled={loading || parsedCards.length === 0}
            className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 disabled:opacity-50 transition"
          >
            {loading ? t('bulk.adding') : t('bulk.addAll')}
          </button>
        </div>
      </form>
    </div>
  );
}
