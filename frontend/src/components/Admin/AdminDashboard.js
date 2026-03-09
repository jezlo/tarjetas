import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { getCurrentUser } from '../../utils/authUtils';
import { formatDateWithTimezone } from '../../utils/dateUtils';
import { useTranslation } from '../../hooks/useTranslation';
import Navbar from '../Navbar';

const TIMEZONES = [
  'UTC',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Anchorage',
  'America/Mexico_City',
  'America/Bogota',
  'America/Lima',
  'America/Santiago',
  'America/Buenos_Aires',
  'America/Sao_Paulo',
  'America/Caracas',
  'America/Halifax',
  'America/St_Johns',
  'Europe/London',
  'Europe/Dublin',
  'Europe/Lisbon',
  'Europe/Madrid',
  'Europe/Paris',
  'Europe/Berlin',
  'Europe/Rome',
  'Europe/Amsterdam',
  'Europe/Brussels',
  'Europe/Vienna',
  'Europe/Warsaw',
  'Europe/Prague',
  'Europe/Budapest',
  'Europe/Bucharest',
  'Europe/Athens',
  'Europe/Helsinki',
  'Europe/Stockholm',
  'Europe/Oslo',
  'Europe/Copenhagen',
  'Europe/Zurich',
  'Europe/Moscow',
  'Europe/Istanbul',
  'Africa/Cairo',
  'Africa/Nairobi',
  'Africa/Johannesburg',
  'Africa/Lagos',
  'Africa/Casablanca',
  'Asia/Dubai',
  'Asia/Karachi',
  'Asia/Kolkata',
  'Asia/Dhaka',
  'Asia/Bangkok',
  'Asia/Jakarta',
  'Asia/Singapore',
  'Asia/Kuala_Lumpur',
  'Asia/Hong_Kong',
  'Asia/Shanghai',
  'Asia/Taipei',
  'Asia/Seoul',
  'Asia/Tokyo',
  'Asia/Manila',
  'Asia/Kabul',
  'Asia/Tehran',
  'Asia/Baghdad',
  'Asia/Riyadh',
  'Asia/Tashkent',
  'Asia/Almaty',
  'Asia/Yekaterinburg',
  'Asia/Novosibirsk',
  'Asia/Vladivostok',
  'Australia/Perth',
  'Australia/Darwin',
  'Australia/Adelaide',
  'Australia/Brisbane',
  'Australia/Sydney',
  'Australia/Melbourne',
  'Pacific/Auckland',
  'Pacific/Fiji',
  'Pacific/Honolulu',
  'Pacific/Tahiti',
];

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({ username: '', email: '', password: '', is_admin: false });
  const [createError, setCreateError] = useState('');
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetTarget, setResetTarget] = useState(null); // { id, username }
  const [resetPassword, setResetPassword] = useState('');
  const [resetError, setResetError] = useState('');
  const [resetting, setResetting] = useState(false);
  const [registrationEnabled, setRegistrationEnabled] = useState(null);
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [settingsError, setSettingsError] = useState('');
  const [settingsUpdating, setSettingsUpdating] = useState(false);
  const [timezone, setTimezone] = useState('UTC');
  const [timezoneInput, setTimezoneInput] = useState('UTC');
  const [timezoneSaving, setTimezoneSaving] = useState(false);
  const [timezoneError, setTimezoneError] = useState('');

  const currentUser = getCurrentUser();

  const fetchUsers = useCallback(() => {
    setLoading(true);
    api.get('/admin/users')
      .then(({ data }) => { setUsers(data); setLoading(false); })
      .catch((err) => {
        if (err.response?.status === 403) {
          navigate('/');
        } else {
          setError(t('admin.loadError'));
          setLoading(false);
        }
      });
  }, [navigate, t]);

  const fetchSettings = useCallback(() => {
    setSettingsLoading(true);
    api.get('/admin/settings')
      .then(({ data }) => {
        setRegistrationEnabled(data.registration_enabled);
        const tz = data.timezone || 'UTC';
        setTimezone(tz);
        setTimezoneInput(tz);
        setSettingsLoading(false);
      })
      .catch(() => {
        setSettingsError(t('admin.loadSettingsError'));
        setSettingsLoading(false);
      });
  }, [t]);

  useEffect(() => {
    fetchUsers();
    fetchSettings();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleDelete = (userId) => {
    if (!window.confirm(t('admin.deleteConfirm'))) return;
    setDeletingId(userId);
    api.delete(`/admin/users/${userId}`)
      .then(() => {
        setUsers((prev) => prev.filter((u) => u.id !== userId));
        setDeletingId(null);
      })
      .catch(() => {
        setError(t('admin.couldNotDelete'));
        setDeletingId(null);
      });
  };

  const handleCreate = (e) => {
    e.preventDefault();
    setCreateError('');
    setCreating(true);
    api.post('/admin/users', createForm)
      .then(({ data }) => {
        setUsers((prev) => [data, ...prev]);
        setShowCreateModal(false);
        setCreateForm({ username: '', email: '', password: '', is_admin: false });
        setCreating(false);
      })
      .catch((err) => {
        setCreateError(err.response?.data?.message || t('admin.couldNotCreate'));
        setCreating(false);
      });
  };

  const handleResetPassword = (e) => {
    e.preventDefault();
    setResetError('');
    setResetting(true);
    api.put(`/admin/users/${resetTarget.id}`, { password: resetPassword })
      .then(() => {
        setShowResetModal(false);
        setResetTarget(null);
        setResetPassword('');
        setResetting(false);
      })
      .catch((err) => {
        setResetError(err.response?.data?.message || t('admin.couldNotReset'));
        setResetting(false);
      });
  };

  const handleOpenResetModal = (user) => {
    setResetTarget({ id: user.id, username: user.username });
    setResetPassword('');
    setResetError('');
    setShowResetModal(true);
  };

  const handleToggleRegistration = () => {
    setSettingsError('');
    setSettingsUpdating(true);
    api.put('/admin/settings', { registration_enabled: !registrationEnabled })
      .then(({ data }) => {
        setRegistrationEnabled(data.registration_enabled);
        setSettingsUpdating(false);
      })
      .catch(() => {
        setSettingsError(t('admin.couldNotUpdate'));
        setSettingsUpdating(false);
      });
  };

  const handleSaveTimezone = () => {
    setTimezoneError('');
    setTimezoneSaving(true);
    api.put('/admin/settings', { timezone: timezoneInput })
      .then(({ data }) => {
        const tz = data.timezone || 'UTC';
        setTimezone(tz);
        setTimezoneInput(tz);
        setTimezoneSaving(false);
      })
      .catch(() => {
        setTimezoneError(t('admin.timezoneCouldNotUpdate'));
        setTimezoneSaving(false);
      });
  };

  const formatDate = (iso) => formatDateWithTimezone(iso, timezone, t('admin.never'));

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Navbar */}
      <Navbar />

      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-100">{t('admin.title')}</h2>
            <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">{t('admin.subtitle')}</p>
          </div>
          <button
            onClick={() => { setShowCreateModal(true); setCreateError(''); }}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition font-medium"
          >
            {t('admin.newUser')}
          </button>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg mb-4">
            {error}
          </div>
        )}

        {/* Stats summary */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow p-4 text-center">
            <p className="text-2xl font-bold text-indigo-600">{users.length}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('admin.totalUsers')}</p>
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow p-4 text-center">
            <p className="text-2xl font-bold text-indigo-600">
              {users.reduce((sum, u) => sum + (u.deck_count || 0), 0)}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('admin.totalDecks')}</p>
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow p-4 text-center">
            <p className="text-2xl font-bold text-indigo-600">
              {users.filter((u) => u.is_admin).length}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('admin.admins')}</p>
          </div>
        </div>

        {/* Users table */}
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-gray-400 dark:text-gray-500">{t('admin.loadingUsers')}</div>
          ) : users.length === 0 ? (
            <div className="p-8 text-center text-gray-400 dark:text-gray-500">{t('admin.noUsers')}</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-800 text-left text-gray-500 dark:text-gray-400 uppercase text-xs tracking-wider">
                    <th className="px-4 py-3">{t('admin.user')}</th>
                    <th className="px-4 py-3">{t('admin.email')}</th>
                    <th className="px-4 py-3 text-center">{t('nav.decks')}</th>
                    <th className="px-4 py-3">{t('admin.registered')}</th>
                    <th className="px-4 py-3">{t('admin.lastLogin')}</th>
                    <th className="px-4 py-3 text-center">{t('admin.role')}</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {users.map((u) => (
                    <tr key={u.id} className="hover:bg-gray-50 dark:hover:bg-gray-800 transition">
                      <td className="px-4 py-3 font-medium text-gray-800 dark:text-gray-100">
                        {u.username}
                        {u.id === currentUser.id && (
                          <span className="ml-2 text-xs text-gray-400 dark:text-gray-500">{t('admin.you')}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{u.email}</td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-block bg-indigo-50 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 font-semibold px-2 py-0.5 rounded-full text-xs">
                          {u.deck_count}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{formatDate(u.created_at)}</td>
                      <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{formatDate(u.last_login)}</td>
                      <td className="px-4 py-3 text-center">
                        {u.is_admin ? (
                          <span className="inline-block bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 text-xs px-2 py-0.5 rounded-full font-semibold">
                            {t('admin.adminRole')}
                          </span>
                        ) : (
                          <span className="inline-block bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs px-2 py-0.5 rounded-full">
                            {t('admin.userRole')}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => handleOpenResetModal(u)}
                            className="text-indigo-500 hover:text-indigo-700 text-xs font-medium"
                          >
                            Reset Password
                          </button>
                          <button
                            onClick={() => handleDelete(u.id)}
                            disabled={deletingId === u.id || u.id === currentUser.id}
                            className="text-red-500 hover:text-red-700 text-xs font-medium disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            {deletingId === u.id ? t('admin.deleting') : t('common.delete')}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Global Settings */}
        <div className="mt-8">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">{t('admin.globalSettings')}</h3>
          {settingsError && (
            <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg mb-4">
              {settingsError}
            </div>
          )}
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-800 dark:text-gray-100">{t('admin.userRegistration')}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {settingsLoading
                    ? t('admin.loading')
                    : registrationEnabled
                      ? t('admin.regEnabled')
                      : t('admin.regDisabled')}
                </p>
              </div>
              <button
                onClick={handleToggleRegistration}
                disabled={settingsLoading || settingsUpdating}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900 disabled:opacity-50 disabled:cursor-not-allowed ${registrationEnabled ? 'bg-indigo-600' : 'bg-gray-300 dark:bg-gray-600'}`}
                aria-label="Toggle user registration"
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${registrationEnabled ? 'translate-x-6' : 'translate-x-1'}`}
                />
              </button>
            </div>
            <div className="border-t border-gray-100 dark:border-gray-700 mt-6 pt-6">
              <div>
                <p className="font-medium text-gray-800 dark:text-gray-100">{t('admin.timezone')}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('admin.timezoneDesc')}</p>
              </div>
              {timezoneError && (
                <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-3 py-2 rounded-lg mt-3 text-sm">
                  {timezoneError}
                </div>
              )}
              <div className="flex items-center gap-3 mt-3">
                <select
                  value={timezoneInput}
                  onChange={(e) => setTimezoneInput(e.target.value)}
                  disabled={settingsLoading || timezoneSaving}
                  className="flex-1 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
                >
                  {TIMEZONES.map((tz) => (
                    <option key={tz} value={tz}>{tz}</option>
                  ))}
                </select>
                <button
                  onClick={handleSaveTimezone}
                  disabled={settingsLoading || timezoneSaving || timezoneInput === timezone}
                  className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {timezoneSaving ? t('admin.timezoneSaving') : t('admin.timezoneSave')}
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Create user modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-md p-6">
            <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-4">{t('admin.createNewUser')}</h3>
            {createError && (
              <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-2 rounded-lg mb-4 text-sm">
                {createError}
              </div>
            )}
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('admin.username')}</label>
                <input
                  type="text"
                  value={createForm.username}
                  onChange={(e) => setCreateForm({ ...createForm, username: e.target.value })}
                  className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('admin.email')}</label>
                <input
                  type="email"
                  value={createForm.email}
                  onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                  className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('admin.password')}</label>
                <input
                  type="password"
                  value={createForm.password}
                  onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                  className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_admin"
                  checked={createForm.is_admin}
                  onChange={(e) => setCreateForm({ ...createForm, is_admin: e.target.checked })}
                  className="rounded border-gray-300 dark:border-gray-600 text-indigo-600 focus:ring-indigo-500"
                />
                <label htmlFor="is_admin" className="text-sm text-gray-700 dark:text-gray-300">{t('admin.grantAdmin')}</label>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={creating}
                  className="flex-1 bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 transition font-medium disabled:opacity-60"
                >
                  {creating ? t('admin.creating') : t('admin.createUser')}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowCreateModal(false); setCreateError(''); }}
                  className="flex-1 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition font-medium"
                >
                  {t('common.cancel')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset password modal */}
      {showResetModal && resetTarget && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-sm p-6">
            <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-1">{t('admin.resetPassword')}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{t('admin.resetPasswordFor')} <span className="font-semibold text-gray-700 dark:text-gray-200">{resetTarget.username}</span></p>
            {resetError && (
              <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-2 rounded-lg mb-4 text-sm">
                {resetError}
              </div>
            )}
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('admin.newPassword')}</label>
                <input
                  type="password"
                  value={resetPassword}
                  onChange={(e) => setResetPassword(e.target.value)}
                  className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                  autoComplete="new-password"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={resetting}
                  className="flex-1 bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 transition font-medium disabled:opacity-60"
                >
                  {resetting ? t('admin.resetting') : t('admin.resetPassword')}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowResetModal(false); setResetTarget(null); setResetError(''); }}
                  className="flex-1 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition font-medium"
                >
                  {t('common.cancel')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
