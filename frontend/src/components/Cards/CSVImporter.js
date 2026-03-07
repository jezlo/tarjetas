import React, { useState } from 'react';
import api from '../../services/api';

export default function CSVImporter({ deckId, onImported }) {
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
      setError(err.response?.data?.message || 'Import failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow p-6 max-w-lg mx-auto">
      <h3 className="text-lg font-semibold text-gray-800 mb-2">Import CSV</h3>
      <p className="text-sm text-gray-500 mb-4">
        The CSV must have <code className="bg-gray-100 px-1 rounded">question</code> and{' '}
        <code className="bg-gray-100 px-1 rounded">answer</code> columns. An optional{' '}
        <code className="bg-gray-100 px-1 rounded">context</code> column can also be included.
      </p>
      {error && <p className="text-red-500 text-sm mb-3">{error}</p>}
      {message && <p className="text-green-600 text-sm mb-3">{message}</p>}
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="file"
          accept=".csv"
          onChange={(e) => setFile(e.target.files[0])}
          required
          className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
        />
        <button
          type="submit"
          disabled={loading || !file}
          className="w-full bg-indigo-600 text-white py-2 rounded-lg font-semibold hover:bg-indigo-700 disabled:opacity-50 transition"
        >
          {loading ? 'Importing…' : 'Import'}
        </button>
      </form>
    </div>
  );
}
