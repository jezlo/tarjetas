import React, { useState } from 'react';
import api from '../../services/api';
import { useTranslation } from '../../hooks/useTranslation';

export default function CSVImporter({ deckId, onImported }) {
  const { t } = useTranslation();
  const [file, setFile] = useState(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) return;
    setError('');
    setMessage('');
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const { data } = await api.post(`/decks/${deckId}/import`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setMessage(data.message);
      setFile(null);
      onImported();
    } catch (err) {
      setError(err.response?.data?.message || t('csv.failed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6 max-w-lg mx-auto">
      <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-2">{t('csv.title')}</h3>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
        {t('csv.desc', { question: 'question', answer: 'answer', context: 'context' })}
      </p>
      {error && <p className="text-red-500 text-sm mb-3">{error}</p>}
      {message && <p className="text-green-600 text-sm mb-3">{message}</p>}
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="file"
          accept=".csv"
          onChange={(e) => setFile(e.target.files[0])}
          required
          className="block w-full text-sm text-gray-500 dark:text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 dark:file:bg-indigo-900 dark:file:text-indigo-300"
        />
        <button
          type="submit"
          disabled={loading || !file}
          className="w-full bg-indigo-600 text-white py-2 rounded-lg font-semibold hover:bg-indigo-700 disabled:opacity-50 transition"
        >
          {loading ? t('csv.importing') : t('csv.import')}
        </button>
      </form>
    </div>
  );
}
