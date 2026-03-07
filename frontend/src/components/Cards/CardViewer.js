import React, { useState, useRef, useEffect } from 'react';
import api from '../../services/api';

const SLIDE_DURATION = 500;

function normalizeAnswer(str) {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

export default function CardViewer({ cards, index, onNext, onPrev, onResult, invertCards, autoFlipDelay, onMark, markedCardIds }) {
  const [flipped, setFlipped] = useState(false);
  const [transitioning, setTransitioning] = useState(false);
  const [slideDir, setSlideDir] = useState(null); // 'out-left' | null
  const displayedCard = useRef(cards[index]);
  const autoFlipTimerRef = useRef(null);

  // Fill card state
  const [fillInput, setFillInput] = useState('');
  const [fillSubmitted, setFillSubmitted] = useState(false);
  const [fillCorrect, setFillCorrect] = useState(null);
  const fillInputRef = useRef(null);

  if (!transitioning) {
    displayedCard.current = cards[index];
  }

  const card = displayedCard.current;
  const isFillCard = !!card._isFill;
  const frontText = invertCards ? card.answer : card.question;
  const backText = invertCards ? card.question : card.answer;
  const isMarked = markedCardIds && markedCardIds.has(card.id);

  // Reset fill state when card changes
  useEffect(() => {
    setFillInput('');
    setFillSubmitted(false);
    setFillCorrect(null);
    if (isFillCard) {
      setTimeout(() => {
        if (fillInputRef.current) fillInputRef.current.focus();
      }, 0);
    }
  }, [index, isFillCard]);

  // Auto-flip timer: when autoFlipDelay is set, flip the card automatically
  useEffect(() => {
    if (!autoFlipDelay || flipped || transitioning || isFillCard) return;
    autoFlipTimerRef.current = setTimeout(() => {
      setFlipped(true);
    }, autoFlipDelay * 1000);
    return () => clearTimeout(autoFlipTimerRef.current);
  }, [autoFlipDelay, flipped, transitioning, index, isFillCard]);

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

  const handleFillSubmit = async (e) => {
    e.preventDefault();
    const correct = normalizeAnswer(fillInput.trim()) === normalizeAnswer(card.answer.trim());
    setFillCorrect(correct);
    setFillSubmitted(true);
    try {
      await api.post(`/statistics/cards/${card.id}`, { correct });
    } catch (_) {}
  };

  const handleFillNext = () => {
    if (onResult) onResult(fillCorrect);
    handleNext();
  };

  return (
    <div className="flex flex-col items-center gap-6">
      <p className="text-sm text-gray-500">
        Card {index + 1} of {cards.length}
        {isFillCard && (
          <span className="ml-2 text-xs font-medium bg-purple-100 text-purple-700 rounded px-2 py-0.5">✏️ Fill card</span>
        )}
      </p>

      {isFillCard ? (
        <div className="w-full max-w-lg bg-white rounded-2xl shadow-lg p-6 space-y-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-indigo-400 mb-1">Question</p>
            <p className="text-xl font-semibold text-gray-800">{card.question}</p>
          </div>
          {!fillSubmitted ? (
            <form onSubmit={handleFillSubmit} className="space-y-3">
              <input
                ref={fillInputRef}
                type="text"
                value={fillInput}
                onChange={(e) => setFillInput(e.target.value)}
                placeholder="Type your answer…"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                autoComplete="off"
              />
              <button
                type="submit"
                disabled={!fillInput.trim()}
                className="w-full px-4 py-2 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Check Answer
              </button>
            </form>
          ) : (
            <div className={`rounded-xl p-4 ${fillCorrect ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`} aria-live="polite">
              <p className={`text-sm font-semibold ${fillCorrect ? 'text-green-700' : 'text-red-700'}`}>
                {fillCorrect ? '✓ Correct!' : '✗ Incorrect'}
              </p>
              {!fillCorrect && (
                <p className="text-sm text-gray-600 mt-1">
                  Correct answer: <span className="font-semibold">{card.answer}</span>
                </p>
              )}
              <p className="text-sm text-gray-500 mt-1">Your answer: {fillInput}</p>
            </div>
          )}
        </div>
      ) : (
        <>
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
        </>
      )}

      {isFillCard ? (
        <>
          {fillSubmitted && (
            <button
              onClick={handleFillNext}
              className="px-6 py-2 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition"
            >
              {index === cards.length - 1 ? 'Finish' : 'Next →'}
            </button>
          )}
          <div className="flex gap-4">
            <button
              onClick={handlePrev}
              disabled={index === 0}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-100 disabled:opacity-40 transition"
            >
              ← Prev
            </button>
          </div>
        </>
      ) : (
        <>
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
        </>
      )}
    </div>
  );
}
