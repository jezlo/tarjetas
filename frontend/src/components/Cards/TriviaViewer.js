import React from 'react';
import api from '../../services/api';

export default function TriviaViewer({ cards, index, onNext, onPrev, onResult }) {
  const card = cards[index];

  const handleResult = async (correct) => {
    try {
      await api.post(`/statistics/cards/${card.id}`, { correct });
    } catch (_) {}
    onResult(correct);
    onNext();
  };

  return (
    <div className="flex flex-col items-center gap-6">
      <p className="text-sm text-gray-500">
        Card {index + 1} of {cards.length}
      </p>

      <div className="w-full max-w-lg bg-white rounded-2xl shadow-lg p-6 space-y-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-indigo-400 mb-1">Question</p>
          <p className="text-xl font-semibold text-gray-800">{card.question}</p>
        </div>
        <hr className="border-gray-200" />
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-green-500 mb-1">Answer</p>
          <p className="text-xl font-semibold text-gray-700">{card.answer}</p>
        </div>
      </div>

      <div className="flex gap-4">
        <button
          onClick={() => handleResult(false)}
          className="px-6 py-2 bg-red-100 text-red-600 font-semibold rounded-lg hover:bg-red-200 transition"
        >
          ✗ Wrong
        </button>
        <button
          onClick={() => handleResult(true)}
          className="px-6 py-2 bg-green-100 text-green-600 font-semibold rounded-lg hover:bg-green-200 transition"
        >
          ✓ Correct
        </button>
      </div>

      <div className="flex gap-4">
        <button
          onClick={onPrev}
          disabled={index === 0}
          className="px-4 py-2 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-100 disabled:opacity-40 transition"
        >
          ← Prev
        </button>
        <button
          onClick={onNext}
          disabled={index === cards.length - 1}
          className="px-4 py-2 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-100 disabled:opacity-40 transition"
        >
          Next →
        </button>
      </div>
    </div>
  );
}
