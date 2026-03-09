import React, { useState, useMemo } from 'react';
import api from '../../services/api';
import { useTranslation } from '../../hooks/useTranslation';

function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function TriviaViewer({ cards, index, onNext, onPrev, onResult, invertCards, optionCount = 3, allCards }) {
  const { t } = useTranslation();
  const [selected, setSelected] = useState(null);
  const [pendingResult, setPendingResult] = useState(null);

  const card = cards[index];
  const questionText = invertCards ? card.answer : card.question;
  const correctAnswerText = invertCards ? card.question : card.answer;

  const options = useMemo(() => {
    const pool = (allCards ?? cards).filter((c) => {
      if (c.id === card.id) return false;
      // Exclude cards where question/answer are inverted from the current card
      const cQ = invertCards ? c.answer : c.question;
      const cA = invertCards ? c.question : c.answer;
      if (cQ === correctAnswerText && cA === questionText) return false;
      return true;
    });

    const shuffledPool = shuffleArray(pool);
    const incorrectCount = Math.min(optionCount - 1, shuffledPool.length);
    const incorrectCards = shuffledPool.slice(0, incorrectCount);

    const opts = [
      { text: correctAnswerText, isCorrect: true },
      ...incorrectCards.map((c) => ({
        text: invertCards ? c.question : c.answer,
        isCorrect: false,
      })),
    ];

    return shuffleArray(opts);
  }, [card.id, optionCount, invertCards, allCards, cards, correctAnswerText, questionText]);

  const handleSelect = async (opt) => {
    if (selected !== null) return;
    setSelected(opt);
    const correct = opt.isCorrect;
    try {
      await api.post(`/statistics/cards/${card.id}`, { correct });
    } catch (_) {}
    setPendingResult(correct);
  };

  const handleNext = () => {
    if (pendingResult !== null) onResult(pendingResult);
    setPendingResult(null);
    setSelected(null);
    onNext();
  };

  const handlePrev = () => {
    setPendingResult(null);
    setSelected(null);
    onPrev();
  };

  return (
    <div className="flex flex-col items-center gap-6">
      <p className="text-sm text-gray-500 dark:text-gray-400">
        {t('viewer.cardOf', { n: index + 1, total: cards.length })}
      </p>

      <div className="w-full max-w-lg bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 space-y-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-indigo-400 dark:text-indigo-300 mb-1">{t('viewer.question')}</p>
          <p className="text-xl font-semibold text-gray-800 dark:text-gray-100">{questionText}</p>
        </div>
        {selected !== null && card.context && (
          <>
            <hr className="border-gray-200 dark:border-gray-700" />
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-1">{t('viewer.context')}</p>
              <p className="text-sm italic text-gray-500 dark:text-gray-400">{card.context}</p>
            </div>
          </>
        )}
      </div>

      <div className="w-full max-w-lg space-y-3">
        {options.map((opt, i) => {
          let btnClass = 'w-full px-4 py-3 rounded-lg text-left font-medium transition border ';
          if (selected === null) {
            btnClass += 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 hover:bg-indigo-50 dark:hover:bg-indigo-900 text-gray-800 dark:text-gray-100';
          } else if (opt.isCorrect) {
            btnClass += 'bg-green-100 dark:bg-green-900 border-green-400 dark:border-green-600 text-green-800 dark:text-green-200';
          } else if (selected === opt) {
            btnClass += 'bg-red-100 dark:bg-red-900 border-red-400 dark:border-red-600 text-red-800 dark:text-red-200';
          } else {
            btnClass += 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-400 dark:text-gray-500';
          }
          return (
            <button
              key={i}
              onClick={() => handleSelect(opt)}
              disabled={selected !== null}
              className={btnClass}
            >
              {opt.text}
            </button>
          );
        })}
      </div>

      {selected !== null && (
        <p className={`text-sm font-semibold ${selected.isCorrect ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
          {selected.isCorrect
            ? t('viewer.correct')
            : `${t('viewer.incorrect')} — ${t('viewer.correctAnswer')} ${correctAnswerText}`}
        </p>
      )}

      <div className="flex gap-4">
        <button
          onClick={handlePrev}
          disabled={index === 0}
          className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 transition"
        >
          {t('viewer.prev')}
        </button>
        {selected !== null && (
          <button
            onClick={handleNext}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition"
          >
            {index === cards.length - 1 ? t('viewer.finish') : t('viewer.next')}
          </button>
        )}
      </div>
    </div>
  );
}
