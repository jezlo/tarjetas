import React, { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { getCurrentUser } from '../../utils/authUtils';
import { useTranslation } from '../../hooks/useTranslation';

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

  const logout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user');
    navigate('/login');
  };

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

  const formatDate = (iso) => {
    if (!iso) return t('admin.never');
    const d = new Date(iso);
    return d.toLocaleString();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <nav className="bg-white shadow-sm px-6 py-4 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-indigo-600">{t('app.name')}</h1>
        <div className="flex items-center gap-4">
          <Link to="/" className="text-gray-600 hover:text-indigo-600 font-medium">{t('nav.dashboard')}</Link>
          <Link to="/decks" className="text-gray-600 hover:text-indigo-600 font-medium">{t('nav.decks')}</Link>
          <Link to="/admin" className="text-indigo-600 font-medium">{t('nav.admin')}</Link>
          <button onClick={logout} className="text-sm text-red-500 hover:underline">{t('nav.logout')}</button>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-semibold text-gray-800">{t('admin.title')}</h2>
            <p className="text-gray-500 text-sm mt-1">{t('admin.subtitle')}</p>
          </div>
          <button
            onClick={() => { setShowCreateModal(true); setCreateError(''); }}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition font-medium"
          >
            {t('admin.newUser')}
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
            {error}
          </div>
        )}

        {/* Stats summary */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-xl shadow p-4 text-center">
            <p className="text-2xl font-bold text-indigo-600">{users.length}</p>
            <p className="text-sm text-gray-500 mt-1">{t('admin.totalUsers')}</p>
          </div>
          <div className="bg-white rounded-xl shadow p-4 text-center">
            <p className="text-2xl font-bold text-indigo-600">
              {users.reduce((sum, u) => sum + (u.deck_count || 0), 0)}
            </p>
            <p className="text-sm text-gray-500 mt-1">{t('admin.totalDecks')}</p>
          </div>
          <div className="bg-white rounded-xl shadow p-4 text-center">
            <p className="text-2xl font-bold text-indigo-600">
              {users.filter((u) => u.is_admin).length}
            </p>
            <p className="text-sm text-gray-500 mt-1">{t('admin.admins')}</p>
          </div>
        </div>

        {/* Users table */}
        <div className="bg-white rounded-xl shadow overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-gray-400">{t('admin.loadingUsers')}</div>
          ) : users.length === 0 ? (
            <div className="p-8 text-center text-gray-400">{t('admin.noUsers')}</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-left text-gray-500 uppercase text-xs tracking-wider">
                    <th className="px-4 py-3">{t('admin.user')}</th>
                    <th className="px-4 py-3">{t('admin.email')}</th>
                    <th className="px-4 py-3 text-center">{t('nav.decks')}</th>
                    <th className="px-4 py-3">{t('admin.registered')}</th>
                    <th className="px-4 py-3">{t('admin.lastLogin')}</th>
                    <th className="px-4 py-3 text-center">{t('admin.role')}</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {users.map((u) => (
                    <tr key={u.id} className="hover:bg-gray-50 transition">
                      <td className="px-4 py-3 font-medium text-gray-800">
                        {u.username}
                        {u.id === currentUser.id && (
                          <span className="ml-2 text-xs text-gray-400">{t('admin.you')}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-500">{u.email}</td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-block bg-indigo-50 text-indigo-700 font-semibold px-2 py-0.5 rounded-full text-xs">
                          {u.deck_count}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-500">{formatDate(u.created_at)}</td>
                      <td className="px-4 py-3 text-gray-500">{formatDate(u.last_login)}</td>
                      <td className="px-4 py-3 text-center">
                        {u.is_admin ? (
                          <span className="inline-block bg-purple-100 text-purple-700 text-xs px-2 py-0.5 rounded-full font-semibold">
                            {t('admin.adminRole')}
                          </span>
                        ) : (
                          <span className="inline-block bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-full">
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
          <h3 className="text-lg font-semibold text-gray-800 mb-4">{t('admin.globalSettings')}</h3>
          {settingsError && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
              {settingsError}
            </div>
          )}
          <div className="bg-white rounded-xl shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-800">{t('admin.userRegistration')}</p>
                <p className="text-sm text-gray-500 mt-1">
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
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${registrationEnabled ? 'bg-indigo-600' : 'bg-gray-300'}`}
                aria-label="Toggle user registration"
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${registrationEnabled ? 'translate-x-6' : 'translate-x-1'}`}
                />
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Create user modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <h3 className="text-xl font-semibold text-gray-800 mb-4">{t('admin.createNewUser')}</h3>
            {createError && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-lg mb-4 text-sm">
                {createError}
              </div>
            )}
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('admin.username')}</label>
                <input
                  type="text"
                  value={createForm.username}
                  onChange={(e) => setCreateForm({ ...createForm, username: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('admin.email')}</label>
                <input
                  type="email"
                  value={createForm.email}
                  onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('admin.password')}</label>
                <input
                  type="password"
                  value={createForm.password}
                  onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_admin"
                  checked={createForm.is_admin}
                  onChange={(e) => setCreateForm({ ...createForm, is_admin: e.target.checked })}
                  className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <label htmlFor="is_admin" className="text-sm text-gray-700">{t('admin.grantAdmin')}</label>
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
                  className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-50 transition font-medium"
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
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <h3 className="text-xl font-semibold text-gray-800 mb-1">{t('admin.resetPassword')}</h3>
            <p className="text-sm text-gray-500 mb-4">{t('admin.resetPasswordFor')} <span className="font-semibold text-gray-700">{resetTarget.username}</span></p>
            {resetError && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-lg mb-4 text-sm">
                {resetError}
              </div>
            )}
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('admin.newPassword')}</label>
                <input
                  type="password"
                  value={resetPassword}
                  onChange={(e) => setResetPassword(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
                  className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-50 transition font-medium"
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
