import React, { useState } from 'react';
import api from '../../services/api';

export default function BulkAddCards({ deckId, onSaved }) {
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const parseCards = (raw) => {
    return raw
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .map((line) => {
        const firstComma = line.indexOf(',');
        if (firstComma === -1) return null;
        const question = line.slice(0, firstComma).trim();
        const rest = line.slice(firstComma + 1);
        const secondComma = rest.indexOf(',');
        let answer;
        let context;
        if (secondComma === -1) {
          answer = rest.trim();
          context = undefined;
        } else {
          answer = rest.slice(0, secondComma).trim();
          context = rest.slice(secondComma + 1).trim();
        }
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
      setError('No valid cards found. Each line must be: question, answer[, context]');
      return;
    }

    setLoading(true);
    try {
      await Promise.all(cards.map((card) => api.post(`/decks/${deckId}/cards`, card)));
      setMessage(`${cards.length} card${cards.length !== 1 ? 's' : ''} added successfully.`);
      setText('');
      onSaved();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add cards');
    } finally {
      setLoading(false);
    }
  };

  const parsedCards = parseCards(text);

  return (
    <div className="bg-white rounded-xl shadow p-6 max-w-2xl mx-auto">
      <h3 className="text-lg font-semibold text-gray-800 mb-2">Bulk Add Cards</h3>
      <p className="text-sm text-gray-500 mb-4">
        Enter one card per line in the format:{' '}
        <code className="bg-gray-100 px-1 rounded">question, answer[, context]</code>
        {' '}— the <code className="bg-gray-100 px-1 rounded">context</code> column is optional.
      </p>
      {error && <p className="text-red-500 text-sm mb-3">{error}</p>}
      {message && <p className="text-green-600 text-sm mb-3">{message}</p>}
      <form onSubmit={handleSubmit} className="space-y-4">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={12}
          placeholder={"What is the capital of France?, Paris, Largest city in France\nWhat is 2+2?, 4\nWho wrote Hamlet?, Shakespeare, Written around 1600"}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-400"
        />
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-400">
            {parsedCards.length} card{parsedCards.length !== 1 ? 's' : ''} detected
          </span>
          <button
            type="submit"
            disabled={loading || parsedCards.length === 0}
            className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 disabled:opacity-50 transition"
          >
            {loading ? 'Adding…' : 'Add All Cards'}
          </button>
        </div>
      </form>
    </div>
  );
}
