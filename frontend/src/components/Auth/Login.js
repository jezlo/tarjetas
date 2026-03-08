import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../../services/api';
import { useTranslation } from '../../hooks/useTranslation';
import { useLanguage } from '../../contexts/LanguageContext';

const REGISTRATION_ENABLED = process.env.REACT_APP_REGISTRATION_ENABLED !== 'false';

export default function Login() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { language, setLanguage } = useLanguage();
  const [form, setForm] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await api.post('/auth/login', form);
      localStorage.setItem('access_token', data.access_token);
      localStorage.setItem('user', JSON.stringify(data.user));
      // Sync language from user profile
      if (data.user.language) setLanguage(data.user.language);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || t('login.error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-indigo-50">
      <div className="bg-white p-8 rounded-2xl shadow-lg w-full max-w-md">
        <div className="flex justify-end mb-2">
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="text-xs border border-gray-200 rounded px-2 py-1 text-gray-500 focus:outline-none focus:ring-1 focus:ring-indigo-400"
            aria-label="Select language"
          >
            <option value="es">Español</option>
            <option value="en">English</option>
          </select>
        </div>
        <h1 className="text-3xl font-bold text-indigo-600 mb-6 text-center">{t('app.name')}</h1>
        <h2 className="text-xl font-semibold mb-4 text-center text-gray-700">{t('login.signIn')}</h2>
        {error && <p className="text-red-500 text-sm mb-4 text-center">{error}</p>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('login.username')}</label>
            <input
              name="username"
              value={form.username}
              onChange={handleChange}
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('login.password')}</label>
            <input
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 text-white py-2 rounded-lg font-semibold hover:bg-indigo-700 disabled:opacity-50 transition"
          >
            {loading ? t('login.submitting') : t('login.submit')}
          </button>
        </form>
        {REGISTRATION_ENABLED && (
          <p className="mt-4 text-center text-sm text-gray-600">
            {t('login.noAccount')}{' '}
            <Link to="/register" className="text-indigo-600 font-medium hover:underline">
              {t('login.register')}
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}
