import React, { useState, useRef, useEffect } from 'react';
import api from '../../services/api';
import { useTranslation } from '../../hooks/useTranslation';

function normalizeAnswer(str) {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function levenshtein(a, b) {
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) dp[i][j] = dp[i - 1][j - 1];
      else dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

const MAX_LEVENSHTEIN_DISTANCE = 2;

export default function FillViewer({ cards, index, onNext, onPrev, onResult, weakMode, showCharCount }) {
  const { t } = useTranslation();
  const [inputValue, setInputValue] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [isCorrect, setIsCorrect] = useState(null);
  const inputRef = useRef(null);

  const card = cards[index];

  useEffect(() => {
    setInputValue('');
    setSubmitted(false);
    setIsCorrect(null);
    if (inputRef.current) inputRef.current.focus();
  }, [index]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const userNorm = normalizeAnswer(inputValue);
    const correctNorm = normalizeAnswer(card.answer);
    let correct;
    if (weakMode) {
      correct = userNorm === correctNorm || levenshtein(userNorm, correctNorm) <= MAX_LEVENSHTEIN_DISTANCE;
    } else {
      correct = userNorm === correctNorm;
    }
    setIsCorrect(correct);
    setSubmitted(true);
    try {
      await api.post(`/statistics/cards/${card.id}`, { correct });
    } catch (err) {
      console.error('Failed to record card statistic:', err);
    }
  };

  const handleNext = () => {
    if (onResult) onResult(isCorrect);
    onNext();
  };

  return (
    <div className="flex flex-col items-center gap-6">
      <p className="text-sm text-gray-500">
        {t('viewer.cardOf', { n: index + 1, total: cards.length })}
        {weakMode && <span className="ml-2 text-xs font-medium bg-blue-100 text-blue-700 rounded px-2 py-0.5">{t('viewer.weak')}</span>}
      </p>

      <div className="w-full max-w-lg bg-white rounded-2xl shadow-lg p-6 space-y-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-indigo-400 mb-1">{t('viewer.question')}</p>
          <p className="text-xl font-semibold text-gray-800">{card.question}</p>
        </div>

        {!submitted ? (
          <form onSubmit={handleSubmit} className="space-y-3">
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={t('viewer.typeAnswer')}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              autoComplete="off"
            />
            {showCharCount && (
              <p className="text-xs text-gray-400 text-right">
                {t('viewer.charCount', { n: inputValue.length, total: card.answer.trim().length })}
              </p>
            )}
            <button
              type="submit"
              disabled={!inputValue.trim()}
              className="w-full px-4 py-2 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {t('viewer.checkAnswer')}
            </button>
          </form>
        ) : (
          <div className={`rounded-xl p-4 ${isCorrect ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`} aria-live="polite">
            <p className={`text-sm font-semibold ${isCorrect ? 'text-green-700' : 'text-red-700'}`}>
              {isCorrect ? t('viewer.correct') : t('viewer.incorrect')}
            </p>
            {!isCorrect && (
              <p className="text-sm text-gray-600 mt-1">
                {t('viewer.correctAnswer')}   <span className="font-semibold">{card.answer}</span>
              </p>
            )}
            <p className="text-sm text-gray-500 mt-1">{t('viewer.yourAnswer')} {inputValue}</p>
            {!isCorrect && card.context && (
              <p className="text-sm text-blue-600 mt-2 italic">💡 {card.context}</p>
            )}
          </div>
        )}
      </div>

      {submitted && (
        <button
          onClick={handleNext}
          disabled={index === cards.length - 1}
          className="px-6 py-2 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {t('viewer.next')}
        </button>
      )}

      <div className="flex gap-4">
        <button
          onClick={onPrev}
          disabled={index === 0}
          className="px-4 py-2 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-100 disabled:opacity-40 transition"
        >
          {t('viewer.prev')}
        </button>
      </div>
    </div>
  );
}
