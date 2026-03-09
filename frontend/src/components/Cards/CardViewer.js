import React, { useState, useRef, useEffect } from 'react';
import api from '../../services/api';
import { useTranslation } from '../../hooks/useTranslation';

const SLIDE_DURATION = 500;

function normalizeAnswer(str) {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

export default function CardViewer({ cards, index, onNext, onPrev, onResult, invertCards, autoFlipDelay, onMark, markedCardIds }) {
  const { t } = useTranslation();
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
      <p className="text-sm text-gray-500 dark:text-gray-400">
        {t('viewer.cardOf', { n: index + 1, total: cards.length })}
        {isFillCard && (
          <span className="ml-2 text-xs font-medium bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 rounded px-2 py-0.5">{t('viewer.fillCard')}</span>
        )}
      </p>

      {isFillCard ? (
        <div className="w-full max-w-lg bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 space-y-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-indigo-400 mb-1">{t('viewer.question')}</p>
            <p className="text-xl font-semibold text-gray-800 dark:text-gray-100">{card.question}</p>
          </div>
          {!fillSubmitted ? (
            <form onSubmit={handleFillSubmit} className="space-y-3">
              <input
                ref={fillInputRef}
                type="text"
                value={fillInput}
                onChange={(e) => setFillInput(e.target.value)}
                placeholder={t('viewer.typeAnswer')}
                className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                autoComplete="off"
              />
              <button
                type="submit"
                disabled={!fillInput.trim()}
                className="w-full px-4 py-2 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {t('viewer.checkAnswer')}
              </button>
            </form>
          ) : (
            <div className={`rounded-xl p-4 ${fillCorrect ? 'bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800' : 'bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800'}`} aria-live="polite">
              <p className={`text-sm font-semibold ${fillCorrect ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}>
                {fillCorrect ? t('viewer.correct') : t('viewer.incorrect')}
              </p>
              {!fillCorrect && (
                <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                  {t('viewer.correctAnswer')}   <span className="font-semibold">{card.answer}</span>
                </p>
              )}
              {card.context ? (
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {t('viewer.context')}   <span className="italic">{card.context}</span>
                </p>
              ) : null}
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('viewer.yourAnswer')} {fillInput}</p>
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
              <div className="card-face bg-white dark:bg-gray-800 rounded-2xl shadow-lg flex items-center justify-center p-6">
                <p className="text-xl font-semibold text-gray-800 dark:text-gray-100 text-center">{frontText}</p>
              </div>
              {/* Back */}
              <div className="card-face card-back bg-indigo-600 dark:bg-indigo-700 rounded-2xl shadow-lg flex flex-col items-center justify-center p-6 gap-3">
                <p className="text-xl font-semibold text-white text-center">{backText}</p>
                {card.context ? (
                  <p className="text-sm text-indigo-200 text-center mt-1">{card.context}</p>
                ) : null}
              </div>
            </div>
          </div>
          <p className="text-sm text-gray-400 dark:text-gray-500">{t('viewer.clickFlip')}</p>
        </>
      )}

      {isFillCard ? (
        <>
          {fillSubmitted && (
            <button
              onClick={handleFillNext}
              className="px-6 py-2 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition"
            >
              {index === cards.length - 1 ? t('viewer.finish') : t('viewer.next')}
            </button>
          )}
          <div className="flex gap-4">
            <button
              onClick={handlePrev}
              disabled={index === 0}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 transition"
            >
              {t('viewer.prev')}
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
              className="px-5 py-2 bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300 font-semibold rounded-lg hover:bg-yellow-200 dark:hover:bg-yellow-800 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {t('viewer.known')}  
            </button>
            <button
              onClick={() => recordResult(true, false)}
              disabled={transitioning}
              aria-label="Mark as easy"
              className="px-5 py-2 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 font-semibold rounded-lg hover:bg-blue-200 dark:hover:bg-blue-800 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {t('viewer.easy')}  
            </button>
            <button
              onClick={handleMark}
              disabled={transitioning}
              aria-label={isMarked ? t('viewer.unpinCard') : t('viewer.pinCard')}
              title={isMarked ? 'Unpin card' : 'Pin card for later review'}
              className={`px-5 py-2 font-semibold rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed ${
                isMarked
                  ? 'bg-orange-200 dark:bg-orange-900 text-orange-700 dark:text-orange-300 hover:bg-orange-300 dark:hover:bg-orange-800'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              📌 {isMarked ? 'Pinned' : 'Pin'}
            </button>
          </div>

          <div className="flex gap-4">
            <button
              onClick={() => recordResult(false)}
              disabled={!flipped || transitioning}
              className="px-6 py-2 bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-300 font-semibold rounded-lg hover:bg-red-200 dark:hover:bg-red-800 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {t('viewer.wrong')}
            </button>
            <button
              onClick={() => recordResult(true)}
              disabled={!flipped || transitioning}
              className="px-6 py-2 bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-300 font-semibold rounded-lg hover:bg-green-200 dark:hover:bg-green-800 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {t('viewer.correct2')}
            </button>
          </div>

          <div className="flex gap-4">
            <button
              onClick={handlePrev}
              disabled={index === 0 || transitioning}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 transition"
            >
              {t('viewer.prev')}
            </button>
            <button
              onClick={handleNext}
              disabled={index === cards.length - 1 || transitioning}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 transition"
            >
              {t('viewer.next')}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
