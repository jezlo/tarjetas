import React, { useState } from 'react';
import api from '../../services/api';
import { getCurrentUser } from '../../utils/authUtils';
import { useTranslation } from '../../hooks/useTranslation';
import { useLanguage } from '../../contexts/LanguageContext';
import Navbar from '../Navbar';

export default function UserProfile() {
  const { t } = useTranslation();
  const { language, setLanguage } = useLanguage();
  const user = getCurrentUser();

  const [email, setEmail] = useState(user?.email || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (newPassword && newPassword !== confirmPassword) {
      setError(t('profile.passwordMismatch'));
      return;
    }

    const payload = {};
    if (email && email !== user.email) payload.email = email;
    if (newPassword) {
      payload.current_password = currentPassword;
      payload.new_password = newPassword;
    }

    if (!Object.keys(payload).length) {
      setError(t('profile.noChanges'));
      return;
    }

    setSaving(true);
    try {
      const { data } = await api.put('/auth/profile', payload);
      const updated = { ...user, ...data.user };
      localStorage.setItem('user', JSON.stringify(updated));
      setSuccess(t('profile.success'));
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setError(err.response?.data?.message || t('profile.error'));
    } finally {
      setSaving(false);
    }
  };

  const handleLanguageChange = async (lang) => {
    setLanguage(lang);
    try {
      const { data } = await api.put('/auth/profile', { language: lang });
      const updated = { ...user, ...data.user };
      localStorage.setItem('user', JSON.stringify(updated));
    } catch (_) {}
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="max-w-lg mx-auto px-4 py-8">
        <h2 className="text-2xl font-semibold text-gray-800 mb-1">{t('profile.title')}</h2>
        <p className="text-gray-500 text-sm mb-6">{t('profile.subtitle')}</p>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">
            {error}
          </div>
        )}
        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-4 text-sm">
            {success}
          </div>
        )}

        <div className="bg-white rounded-2xl shadow p-6">
          <p className="text-sm text-gray-500 mb-4">
            {t('profile.username')} <span className="font-semibold text-gray-800">{user?.username}</span>
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('profile.email')}</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <hr className="border-gray-200" />
            <p className="text-sm font-medium text-gray-700">{t('profile.changePassword')}</p>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('profile.currentPassword')}</label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                autoComplete="current-password"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('profile.newPassword')}</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                autoComplete="new-password"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('profile.confirmPassword')}</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                autoComplete="new-password"
              />
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 transition font-medium disabled:opacity-60"
            >
              {saving ? t('profile.saving') : t('profile.saveChanges')}
            </button>
          </form>

          <hr className="border-gray-200 mt-6 mb-4" />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{t('profile.language')}</label>
            <div className="flex gap-3">
              <button
                onClick={() => handleLanguageChange('es')}
                className={`flex-1 py-2 rounded-lg text-sm font-medium border transition ${
                  language === 'es'
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'bg-white text-gray-600 border-gray-300 hover:bg-indigo-50'
                }`}
              >
                🇪🇸 {t('profile.languageSpanish')}
              </button>
              <button
                onClick={() => handleLanguageChange('en')}
                className={`flex-1 py-2 rounded-lg text-sm font-medium border transition ${
                  language === 'en'
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'bg-white text-gray-600 border-gray-300 hover:bg-indigo-50'
                }`}
              >
                🇺🇸 {t('profile.languageEnglish')}
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
