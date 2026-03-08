import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from '../../hooks/useTranslation';
import { getCurrentUser } from '../../utils/authUtils';

const PROMPT_IDS = [
  'generalFlashcards',
  'vocabularyFlashcards',
  'studyQuestions',
  'basicConcepts',
  'rulesFormulas',
  'quickMemorization',
  'comparisons',
  'progressiveDifficulty',
  'fillBlanks1',
  'fillBlanks2',
  'fillBlanks3',
  'everydayVocabulary',
  'everydayVerbs',
];

function extractPlaceholders(text) {
  const matches = text.match(/\[[^\]]+\]/g) || [];
  return [...new Set(matches)];
}

function renderTemplateText(text) {
  const parts = text.split(/(\[[^\]]+\])/g);
  return parts.map((part, i) =>
    /^\[[^\]]+\]$/.test(part) ? (
      <span key={i} className="font-semibold text-indigo-600">
        {part}
      </span>
    ) : (
      <span key={i}>{part}</span>
    )
  );
}

export default function AIPrompts() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const user = getCurrentUser();

  const [values, setValues] = useState({});
  const [copied, setCopied] = useState(null);

  const logout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const getValue = (promptId, placeholder) =>
    (values[promptId] && values[promptId][placeholder]) || '';

  const setValue = (promptId, placeholder, value) => {
    setValues((prev) => ({
      ...prev,
      [promptId]: {
        ...(prev[promptId] || {}),
        [placeholder]: value,
      },
    }));
  };

  const getFilledPrompt = (promptId) => {
    const text = t(`prompts.items.${promptId}.text`);
    const placeholders = extractPlaceholders(text);
    let filled = text;
    for (const placeholder of placeholders) {
      filled = filled.split(placeholder).join(getValue(promptId, placeholder));
    }
    return filled;
  };

  const allFilled = (promptId) => {
    const text = t(`prompts.items.${promptId}.text`);
    const placeholders = extractPlaceholders(text);
    return placeholders.every((p) => getValue(promptId, p).trim() !== '');
  };

  const handleCopy = async (promptId) => {
    try {
      await navigator.clipboard.writeText(getFilledPrompt(promptId));
      setCopied(promptId);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      // fallback: execCommand for environments without clipboard API
      const el = document.createElement('textarea');
      el.value = getFilledPrompt(promptId);
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopied(promptId);
      setTimeout(() => setCopied(null), 2000);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm px-6 py-4 flex justify-between items-center">
        <Link to="/" className="text-2xl font-bold text-indigo-600">
          {t('app.name')}
        </Link>
        <div className="flex items-center gap-4">
          <Link to="/decks" className="text-gray-600 hover:text-indigo-600 font-medium">
            {t('nav.decks')}
          </Link>
          <Link to="/browse" className="text-gray-600 hover:text-indigo-600 font-medium">
            {t('nav.browse')}
          </Link>
          <Link to="/statistics" className="text-gray-600 hover:text-indigo-600 font-medium">
            {t('nav.stats')}
          </Link>
          <Link to="/profile" className="text-gray-600 hover:text-indigo-600 font-medium">
            {t('nav.profile')}
          </Link>
          {user && user.is_admin && (
            <Link to="/admin" className="text-gray-600 hover:text-indigo-600 font-medium">
              {t('nav.admin')}
            </Link>
          )}
          <button onClick={logout} className="text-sm text-red-500 hover:underline">
            {t('nav.logout')}
          </button>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-4 py-8">
        <h2 className="text-2xl font-semibold text-gray-800 mb-2">{t('prompts.title')}</h2>
        <p className="text-gray-500 mb-8">{t('prompts.subtitle')}</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {PROMPT_IDS.map((promptId) => {
            const text = t(`prompts.items.${promptId}.text`);
            const placeholders = extractPlaceholders(text);
            const ready = allFilled(promptId);
            const wasCopied = copied === promptId;

            return (
              <div key={promptId} className="bg-white rounded-xl shadow p-6 flex flex-col">
                <h3 className="text-base font-semibold text-gray-800 mb-3">
                  {t(`prompts.items.${promptId}.name`)}
                </h3>

                <p className="text-sm text-gray-600 leading-relaxed mb-4">
                  {renderTemplateText(text)}
                </p>

                {placeholders.length > 0 && (
                  <div className="space-y-3 mb-4">
                    {placeholders.map((placeholder) => (
                      <div key={placeholder}>
                        <label className="block text-xs font-medium text-gray-500 mb-1">
                          {t('prompts.placeholderHint')} {placeholder}
                        </label>
                        <input
                          type="text"
                          value={getValue(promptId, placeholder)}
                          onChange={(e) => setValue(promptId, placeholder, e.target.value)}
                          placeholder={placeholder}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                        />
                      </div>
                    ))}
                  </div>
                )}

                <div className="mt-auto pt-2">
                  <button
                    onClick={() => handleCopy(promptId)}
                    disabled={!ready}
                    className={`w-full py-2 rounded-lg text-sm font-semibold transition ${
                      wasCopied
                        ? 'bg-green-500 text-white'
                        : ready
                        ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                        : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    {wasCopied ? t('prompts.copied') : t('prompts.copy')}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
