import React from 'react';
import api from '../../services/api';
import { useTranslation } from '../../hooks/useTranslation';

export default function QuestionnaireViewer({ cards, index, onNext, onPrev, onResult, invertCards }) {
  const { t } = useTranslation();
  const card = cards[index];
  const questionText = invertCards ? card.answer : card.question;
  const answerText = invertCards ? card.question : card.answer;

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
        {t('viewer.cardOf', { n: index + 1, total: cards.length })}
      </p>

      <div className="w-full max-w-lg bg-white rounded-2xl shadow-lg p-6 space-y-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-indigo-400 mb-1">{t('viewer.question')}</p>
          <p className="text-xl font-semibold text-gray-800">{questionText}</p>
        </div>
        <hr className="border-gray-200" />
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-green-500 mb-1">{t('viewer.answer')}</p>
          <p className="text-xl font-semibold text-gray-700">{answerText}</p>
        </div>
        {card.context && (
          <>
            <hr className="border-gray-200" />
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">{t('viewer.context')}</p>
              <p className="text-sm italic text-gray-500">{card.context}</p>
            </div>
          </>
        )}
      </div>

      <div className="flex gap-4">
        <button
          onClick={() => handleResult(false)}
          className="px-6 py-2 bg-red-100 text-red-600 font-semibold rounded-lg hover:bg-red-200 transition"
        >
          {t('viewer.wrong')}
        </button>
        <button
          onClick={() => handleResult(true)}
          className="px-6 py-2 bg-green-100 text-green-600 font-semibold rounded-lg hover:bg-green-200 transition"
        >
          {t('viewer.correct2')}
        </button>
      </div>

      <div className="flex gap-4">
        <button
          onClick={onPrev}
          disabled={index === 0}
          className="px-4 py-2 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-100 disabled:opacity-40 transition"
        >
          {t('viewer.prev')}
        </button>
        <button
          onClick={onNext}
          disabled={index === cards.length - 1}
          className="px-4 py-2 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-100 disabled:opacity-40 transition"
        >
          {t('viewer.next')}
        </button>
      </div>
    </div>
  );
}
