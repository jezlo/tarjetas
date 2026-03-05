import React, { useState } from 'react';
import api from '../../services/api';

export default function CardViewer({ cards, index, onNext, onPrev }) {
  const [flipped, setFlipped] = useState(false);
  const card = cards[index];

  const handleFlip = () => setFlipped((f) => !f);

  const handleNext = () => {
    setFlipped(false);
    onNext();
  };

  const handlePrev = () => {
    setFlipped(false);
    onPrev();
  };

  const recordResult = async (correct) => {
    try {
      await api.post(`/statistics/cards/${card.id}`, { correct });
    } catch (_) {}
    handleNext();
  };

  return (
    <div className="flex flex-col items-center gap-6">
      <p className="text-sm text-gray-500">
        Card {index + 1} of {cards.length}
      </p>

      <div className="card-scene w-full max-w-lg h-56 cursor-pointer" onClick={handleFlip}>
        <div className={`card-flip ${flipped ? 'flipped' : ''} w-full h-full`}>
          {/* Front */}
          <div className="card-face bg-white rounded-2xl shadow-lg flex items-center justify-center p-6">
            <p className="text-xl font-semibold text-gray-800 text-center">{card.question}</p>
          </div>
          {/* Back */}
          <div className="card-face card-back bg-indigo-600 rounded-2xl shadow-lg flex items-center justify-center p-6">
            <p className="text-xl font-semibold text-white text-center">{card.answer}</p>
          </div>
        </div>
      </div>

      <p className="text-sm text-gray-400">Click card to flip</p>

      {flipped && (
        <div className="flex gap-4">
          <button
            onClick={() => recordResult(false)}
            className="px-6 py-2 bg-red-100 text-red-600 font-semibold rounded-lg hover:bg-red-200 transition"
          >
            ✗ Wrong
          </button>
          <button
            onClick={() => recordResult(true)}
            className="px-6 py-2 bg-green-100 text-green-600 font-semibold rounded-lg hover:bg-green-200 transition"
          >
            ✓ Correct
          </button>
        </div>
      )}

      <div className="flex gap-4">
        <button
          onClick={handlePrev}
          disabled={index === 0}
          className="px-4 py-2 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-100 disabled:opacity-40 transition"
        >
          ← Prev
        </button>
        <button
          onClick={handleNext}
          disabled={index === cards.length - 1}
          className="px-4 py-2 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-100 disabled:opacity-40 transition"
        >
          Next →
        </button>
      </div>
    </div>
  );
}
