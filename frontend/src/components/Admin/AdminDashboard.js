import React, { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { getCurrentUser } from '../../utils/authUtils';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({ username: '', email: '', password: '', is_admin: false });
  const [createError, setCreateError] = useState('');
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const currentUser = getCurrentUser();

  const fetchUsers = useCallback(() => {
    setLoading(true);
    api.get('/admin/users')
      .then(({ data }) => { setUsers(data); setLoading(false); })
      .catch((err) => {
        if (err.response?.status === 403) {
          navigate('/');
        } else {
          setError('Could not load users.');
          setLoading(false);
        }
      });
  }, [navigate]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const logout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const handleDelete = (userId) => {
    if (!window.confirm('Delete this user? This will also delete all their decks and data.')) return;
    setDeletingId(userId);
    api.delete(`/admin/users/${userId}`)
      .then(() => {
        setUsers((prev) => prev.filter((u) => u.id !== userId));
        setDeletingId(null);
      })
      .catch(() => {
        setError('Could not delete user.');
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
        setCreateError(err.response?.data?.message || 'Could not create user.');
        setCreating(false);
      });
  };

  const formatDate = (iso) => {
    if (!iso) return 'Never';
    const d = new Date(iso);
    return d.toLocaleString();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <nav className="bg-white shadow-sm px-6 py-4 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-indigo-600">Tarjetas</h1>
        <div className="flex items-center gap-4">
          <Link to="/" className="text-gray-600 hover:text-indigo-600 font-medium">Dashboard</Link>
          <Link to="/decks" className="text-gray-600 hover:text-indigo-600 font-medium">Decks</Link>
          <Link to="/admin" className="text-indigo-600 font-medium">Admin</Link>
          <button onClick={logout} className="text-sm text-red-500 hover:underline">Logout</button>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-semibold text-gray-800">Admin Dashboard</h2>
            <p className="text-gray-500 text-sm mt-1">Manage users and their data</p>
          </div>
          <button
            onClick={() => { setShowCreateModal(true); setCreateError(''); }}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition font-medium"
          >
            + New User
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
            <p className="text-sm text-gray-500 mt-1">Total Users</p>
          </div>
          <div className="bg-white rounded-xl shadow p-4 text-center">
            <p className="text-2xl font-bold text-indigo-600">
              {users.reduce((sum, u) => sum + (u.deck_count || 0), 0)}
            </p>
            <p className="text-sm text-gray-500 mt-1">Total Decks</p>
          </div>
          <div className="bg-white rounded-xl shadow p-4 text-center">
            <p className="text-2xl font-bold text-indigo-600">
              {users.filter((u) => u.is_admin).length}
            </p>
            <p className="text-sm text-gray-500 mt-1">Admins</p>
          </div>
        </div>

        {/* Users table */}
        <div className="bg-white rounded-xl shadow overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-gray-400">Loading users…</div>
          ) : users.length === 0 ? (
            <div className="p-8 text-center text-gray-400">No users found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-left text-gray-500 uppercase text-xs tracking-wider">
                    <th className="px-4 py-3">User</th>
                    <th className="px-4 py-3">Email</th>
                    <th className="px-4 py-3 text-center">Decks</th>
                    <th className="px-4 py-3">Registered</th>
                    <th className="px-4 py-3">Last Login</th>
                    <th className="px-4 py-3 text-center">Role</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {users.map((u) => (
                    <tr key={u.id} className="hover:bg-gray-50 transition">
                      <td className="px-4 py-3 font-medium text-gray-800">
                        {u.username}
                        {u.id === currentUser.id && (
                          <span className="ml-2 text-xs text-gray-400">(you)</span>
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
                            Admin
                          </span>
                        ) : (
                          <span className="inline-block bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-full">
                            User
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => handleDelete(u.id)}
                          disabled={deletingId === u.id || u.id === currentUser.id}
                          className="text-red-500 hover:text-red-700 text-xs font-medium disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          {deletingId === u.id ? 'Deleting…' : 'Delete'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* Create user modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <h3 className="text-xl font-semibold text-gray-800 mb-4">Create New User</h3>
            {createError && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-lg mb-4 text-sm">
                {createError}
              </div>
            )}
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                <input
                  type="text"
                  value={createForm.username}
                  onChange={(e) => setCreateForm({ ...createForm, username: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={createForm.email}
                  onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
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
                <label htmlFor="is_admin" className="text-sm text-gray-700">Grant admin privileges</label>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={creating}
                  className="flex-1 bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 transition font-medium disabled:opacity-60"
                >
                  {creating ? 'Creating…' : 'Create User'}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowCreateModal(false); setCreateError(''); }}
                  className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-50 transition font-medium"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
