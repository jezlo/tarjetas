import React, { useState, useRef, useEffect } from 'react';
import api from '../../services/api';

const FLIP_DURATION = 600;
const SLIDE_DURATION = 500;

export default function CardViewer({ cards, index, onNext, onPrev, onResult, invertCards, autoFlipDelay, onMark, markedCardIds }) {
  const [flipped, setFlipped] = useState(false);
  const [transitioning, setTransitioning] = useState(false);
  const [slideDir, setSlideDir] = useState(null); // 'out-left' | null
  const displayedCard = useRef(cards[index]);
  const autoFlipTimerRef = useRef(null);

  if (!transitioning) {
    displayedCard.current = cards[index];
  }

  const card = displayedCard.current;
  const frontText = invertCards ? card.answer : card.question;
  const backText = invertCards ? card.question : card.answer;
  const isMarked = markedCardIds && markedCardIds.has(card.id);

  // Auto-flip timer: when autoFlipDelay is set, flip the card automatically
  useEffect(() => {
    if (!autoFlipDelay || flipped || transitioning) return;
    autoFlipTimerRef.current = setTimeout(() => {
      setFlipped(true);
    }, autoFlipDelay * 1000);
    return () => clearTimeout(autoFlipTimerRef.current);
  }, [autoFlipDelay, flipped, transitioning, index]);

  const handleFlip = () => {
    if (!transitioning) {
      clearTimeout(autoFlipTimerRef.current);
      setFlipped((f) => !f);
    }
  };

  const handleNext = () => {
    clearTimeout(autoFlipTimerRef.current);
    setSlideDir('out-left');
    setFlipped(false);
    setTransitioning(true);
    setTimeout(() => {
      setSlideDir(null);
      setTransitioning(false);
      onNext();
    }, SLIDE_DURATION + 100); // slight pause after slide completes (SLIDE_DURATION = 500ms)
  };

  const handlePrev = () => {
    clearTimeout(autoFlipTimerRef.current);
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

  const handleMark = async () => {
    try {
      await api.post(`/statistics/cards/${card.id}/mark`);
      if (onMark) onMark(card.id);
    } catch (_) {}
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
        <div className={`card-flip ${flipped ? 'flipped' : ''} ${slideDir === 'out-left' ? 'card-slide-out' : ''} w-full h-full`}>
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

      <div className="flex gap-3">
        <button
          onClick={() => recordResult(true, true)}
          disabled={transitioning}
          aria-label="Mark card as known"
          className="px-5 py-2 bg-yellow-100 text-yellow-700 font-semibold rounded-lg hover:bg-yellow-200 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          ⭐ Known
        </button>
        <button
          onClick={() => recordResult(true, false)}
          disabled={transitioning}
          aria-label="Mark as easy"
          className="px-5 py-2 bg-blue-100 text-blue-700 font-semibold rounded-lg hover:bg-blue-200 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          ✓ Easy
        </button>
        <button
          onClick={handleMark}
          disabled={transitioning}
          aria-label={isMarked ? 'Unpin card' : 'Pin card for later review'}
          title={isMarked ? 'Unpin card' : 'Pin card for later review'}
          className={`px-5 py-2 font-semibold rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed ${
            isMarked
              ? 'bg-orange-200 text-orange-700 hover:bg-orange-300'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          📌 {isMarked ? 'Pinned' : 'Pin'}
        </button>
      </div>

      <div className="flex gap-4">
        <button
          onClick={() => recordResult(false)}
          disabled={!flipped || transitioning}
          className="px-6 py-2 bg-red-100 text-red-600 font-semibold rounded-lg hover:bg-red-200 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          ✗ Wrong
        </button>
        <button
          onClick={() => recordResult(true)}
          disabled={!flipped || transitioning}
          className="px-6 py-2 bg-green-100 text-green-600 font-semibold rounded-lg hover:bg-green-200 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          ✓ Correct
        </button>
      </div>

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
