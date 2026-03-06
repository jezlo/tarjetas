import React, { useState, useRef } from 'react';
import api from '../../services/api';

const FLIP_DURATION = 600;

export default function CardViewer({ cards, index, onNext, onPrev, onResult, invertCards }) {
  const [flipped, setFlipped] = useState(false);
  const [transitioning, setTransitioning] = useState(false);
  const displayedCard = useRef(cards[index]);

  if (!transitioning) {
    displayedCard.current = cards[index];
  }

  const card = displayedCard.current;
  const frontText = invertCards ? card.answer : card.question;
  const backText = invertCards ? card.question : card.answer;

  const handleFlip = () => {
    if (!transitioning) setFlipped((f) => !f);
  };

  const handleNext = () => {
    setFlipped(false);
    setTransitioning(true);
    setTimeout(() => {
      setTransitioning(false);
      onNext();
    }, FLIP_DURATION);
  };

  const handlePrev = () => {
    setFlipped(false);
    onPrev();
  };

  const recordResult = async (correct, known = false) => {
    try {
      await api.post(`/statistics/cards/${card.id}`, { correct, known });
    } catch (_) {}
    if (onResult) onResult(correct);
    handleNext();
  };

  return (
    <div className="flex flex-col items-center gap-6">
      <p className="text-sm text-gray-500">
        Card {index + 1} of {cards.length}
      </p>

      <div
        className={`card-scene w-full max-w-lg h-56 cursor-pointer transition-opacity ${transitioning ? 'opacity-50 cursor-not-allowed' : ''}`}
        onClick={handleFlip}
      >
        <div className={`card-flip ${flipped ? 'flipped' : ''} w-full h-full`}>
          {/* Front */}
          <div className="card-face bg-white rounded-2xl shadow-lg flex items-center justify-center p-6">
            <p className="text-xl font-semibold text-gray-800 text-center">{frontText}</p>
          </div>
          {/* Back */}
          <div className="card-face card-back bg-indigo-600 rounded-2xl shadow-lg flex items-center justify-center p-6">
            <p className="text-xl font-semibold text-white text-center">{backText}</p>
          </div>
        </div>
      </div>

      <p className="text-sm text-gray-400">Click card to flip</p>

      {!transitioning && (
        <button
          onClick={() => recordResult(true, true)}
          aria-label="Mark card as known"
          className="px-5 py-2 bg-yellow-100 text-yellow-700 font-semibold rounded-lg hover:bg-yellow-200 transition"
        >
          ⭐ Known
        </button>
      )}

      {flipped && !transitioning && (
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
          disabled={index === 0 || transitioning}
          className="px-4 py-2 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-100 disabled:opacity-40 transition"
        >
          ← Prev
        </button>
        <button
          onClick={handleNext}
          disabled={index === cards.length - 1 || transitioning}
          className="px-4 py-2 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-100 disabled:opacity-40 transition"
        >
          Next →
        </button>
      </div>
    </div>
  );
}
