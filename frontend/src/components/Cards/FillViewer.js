import React, { useState, useRef, useEffect } from 'react';
import api from '../../services/api';

export default function FillViewer({ cards, index, onNext, onPrev, onResult }) {
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
    const userAnswer = inputValue.trim().toLowerCase();
    const correctAnswer = card.answer.trim().toLowerCase();
    const correct = userAnswer === correctAnswer;
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
        Card {index + 1} of {cards.length}
      </p>

      <div className="w-full max-w-lg bg-white rounded-2xl shadow-lg p-6 space-y-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-indigo-400 mb-1">Question</p>
          <p className="text-xl font-semibold text-gray-800">{card.question}</p>
        </div>

        {!submitted ? (
          <form onSubmit={handleSubmit} className="space-y-3">
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Type your answer…"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              autoComplete="off"
            />
            <button
              type="submit"
              disabled={!inputValue.trim()}
              className="w-full px-4 py-2 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Check Answer
            </button>
          </form>
        ) : (
          <div className={`rounded-xl p-4 ${isCorrect ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`} aria-live="polite">
            <p className={`text-sm font-semibold ${isCorrect ? 'text-green-700' : 'text-red-700'}`}>
              {isCorrect ? '✓ Correct!' : '✗ Incorrect'}
            </p>
            {!isCorrect && (
              <p className="text-sm text-gray-600 mt-1">
                Correct answer: <span className="font-semibold">{card.answer}</span>
              </p>
            )}
            <p className="text-sm text-gray-500 mt-1">Your answer: {inputValue}</p>
          </div>
        )}
      </div>

      {submitted && (
        <button
          onClick={handleNext}
          disabled={index === cards.length - 1}
          className="px-6 py-2 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Next →
        </button>
      )}

      <div className="flex gap-4">
        <button
          onClick={onPrev}
          disabled={index === 0}
          className="px-4 py-2 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-100 disabled:opacity-40 transition"
        >
          ← Prev
        </button>
      </div>
    </div>
  );
}
