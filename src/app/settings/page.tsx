// app/settings/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface User {
  id: string;
  username: string;
  name: string;
  role: string;
  isActive: boolean;
  createdAt: string;
}

export default function SettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // حالت‌های فرم
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [showManagerProfile, setShowManagerProfile] = useState(false);
  
  // فیلدهای فرم کاربران
  const [newUsername, setNewUsername] = useState('');
  const [newName, setNewName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [newIsActive, setNewIsActive] = useState(true);
  const [changePassword, setChangePassword] = useState(false);

  // فیلدهای فرم منیجر
  const [managerUsername, setManagerUsername] = useState('');
  const [managerName, setManagerName] = useState('');
  const [managerCurrentPassword, setManagerCurrentPassword] = useState('');
  const [managerNewPassword, setManagerNewPassword] = useState('');
  const [managerConfirmPassword, setManagerConfirmPassword] = useState('');
  const [managerChangePassword, setManagerChangePassword] = useState(false);

  useEffect(() => {
    if (status === 'loading') return;
    
    if (!session) {
      router.push('/login');
      return;
    }
    
    loadUsers();
    
    // تنظیم اطلاعات منیجر فعلی
    if (session.user) {
      setManagerUsername(session.user.username || '');
      setManagerName(session.user.name || '');
    }
  }, [session, status, router]);

  useEffect(() => {
    // فیلتر کردن کاربران (فقط کاربران عادی)
    const regularUsers = users.filter(user => user.role === 'user');
    
    // جستجو در کاربران
    if (searchTerm) {
      const filtered = regularUsers.filter(user =>
        user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredUsers(filtered);
    } else {
      setFilteredUsers(regularUsers);
    }
  }, [users, searchTerm]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      setError('');
      
      const response = await fetch('/api/users');
      
      if (response.ok) {
        const usersData = await response.json();
        setUsers(usersData);
      } else {
        setError('Failed to load users');
      }
    } catch (error) {
      console.error('Error loading users:', error);
      setError('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }
    
    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: newUsername,
          name: newName,
          password: newPassword,
          role: 'user',
          isActive: newIsActive,
        }),
      });

      if (response.ok) {
        setSuccess('User created successfully!');
        setShowAddForm(false);
        resetAddForm();
        loadUsers();
        
        setTimeout(() => setSuccess(''), 3000);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to create user');
      }
    } catch (error) {
      console.error('Error creating user:', error);
      setError('Failed to create user');
    }
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!editingUser) return;
    
    if (changePassword) {
      if (newPassword.length < 6) {
        setError('Password must be at least 6 characters long');
        return;
      }
      
      if (newPassword !== confirmPassword) {
        setError('Passwords do not match');
        return;
      }
    }

    try {
      const response = await fetch('/api/users', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: editingUser.id,
          username: newUsername,
          name: newName,
          isActive: newIsActive,
          password: changePassword ? newPassword : undefined,
        }),
      });

      if (response.ok) {
        setSuccess('User updated successfully!');
        setEditingUser(null);
        resetAddForm();
        loadUsers();
        
        setTimeout(() => setSuccess(''), 3000);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to update user');
      }
    } catch (error) {
      console.error('Error updating user:', error);
      setError('Failed to update user');
    }
  };

  const handleUpdateManagerProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (managerChangePassword) {
      if (managerNewPassword.length < 6) {
        setError('New password must be at least 6 characters long');
        return;
      }
      
      if (managerNewPassword !== managerConfirmPassword) {
        setError('New passwords do not match');
        return;
      }
    }

    try {
      const response = await fetch('/api/users/manager', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: managerUsername,
          name: managerName,
          currentPassword: managerChangePassword ? managerCurrentPassword : undefined,
          newPassword: managerChangePassword ? managerNewPassword : undefined,
        }),
      });

      if (response.ok) {
        setSuccess('Manager profile updated successfully!');
        setShowManagerProfile(false);
        resetManagerForm();
        
        // رفرش session برای دریافت اطلاعات به‌روز شده
        if (typeof window !== 'undefined') {
          window.location.reload();
        }
        
        setTimeout(() => setSuccess(''), 3000);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to update manager profile');
      }
    } catch (error) {
      console.error('Error updating manager profile:', error);
      setError('Failed to update manager profile');
    }
  };

  const toggleUserStatus = async (user: User) => {
    try {
      const response = await fetch('/api/users', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: user.id,
          username: user.username,
          name: user.name,
          isActive: !user.isActive,
        }),
      });

      if (response.ok) {
        setSuccess(`User ${!user.isActive ? 'activated' : 'deactivated'} successfully!`);
        loadUsers();
        
        setTimeout(() => setSuccess(''), 3000);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to update user status');
      }
    } catch (error) {
      console.error('Error toggling user status:', error);
      setError('Failed to update user status');
    }
  };

  const resetAddForm = () => {
    setNewUsername('');
    setNewName('');
    setNewPassword('');
    setConfirmPassword('');
    setNewIsActive(true);
    setChangePassword(false);
  };

  const resetManagerForm = () => {
    setManagerCurrentPassword('');
    setManagerNewPassword('');
    setManagerConfirmPassword('');
    setManagerChangePassword(false);
    
    // بازگرداندن اطلاعات فعلی منیجر
    if (session?.user) {
      setManagerUsername(session.user.username || '');
      setManagerName(session.user.name || '');
    }
  };

  const startEditUser = (user: User) => {
    setEditingUser(user);
    setNewUsername(user.username);
    setNewName(user.name);
    setNewIsActive(user.isActive);
    setChangePassword(false);
    setNewPassword('');
    setConfirmPassword('');
    setShowAddForm(false);
    setShowManagerProfile(false);
  };

  const startEditManagerProfile = () => {
    setShowManagerProfile(true);
    setEditingUser(null);
    setShowAddForm(false);
    resetManagerForm();
  };

  const cancelEdit = () => {
    setEditingUser(null);
    resetAddForm();
  };

  const cancelAdd = () => {
    setShowAddForm(false);
    resetAddForm();
  };

  const cancelManagerEdit = () => {
    setShowManagerProfile(false);
    resetManagerForm();
  };

  const getStatusIcon = (isActive: boolean) => {
    return isActive ? '🟢' : '🔴';
  };

  const getStatusText = (isActive: boolean) => {
    return isActive ? 'Active' : 'Blocked';
  };

  const getStatusColor = (isActive: boolean) => {
    return isActive ? 'text-green-600' : 'text-red-600';
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-100 p-6">
      {/* هدر */}
      <div className="bg-white rounded-2xl shadow-xl p-8 mb-8 border border-blue-200">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
          <div>
            <Link 
              href="/dashboard"
              className="inline-flex items-center bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl transition-all duration-200 font-semibold mb-4 lg:mb-0"
            >
              <span className="mr-2">←</span>
              Back to Dashboard
            </Link>
            
            <h1 className="text-3xl md:text-4xl font-bold text-gray-800 mt-4">
              👥 User Management
            </h1>
            <p className="text-gray-600 mt-2">
              Manage user accounts and access permissions
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span className="text-gray-400">🔍</span>
              </div>
              <input
                type="text"
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-800"
              />
            </div>
            
            <button
              onClick={startEditManagerProfile}
              className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-xl transition-all duration-200 font-semibold flex items-center space-x-2"
            >
              <span>👤</span>
              <span>My Profile</span>
            </button>
            
            {session?.user?.role === 'manager' && (
              <button
                onClick={() => {
                  setShowAddForm(true);
                  setEditingUser(null);
                  setShowManagerProfile(false);
                  resetAddForm();
                }}
                className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-xl transition-all duration-200 font-semibold flex items-center space-x-2"
              >
                <span>+</span>
                <span>Add User</span>
              </button>
            )}
            
            <div className="bg-blue-100 text-blue-800 px-4 py-2 rounded-xl font-semibold text-center">
              {filteredUsers.length} Users
            </div>
          </div>
        </div>
      </div>

      {/* پیام‌ها */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-6 py-4 rounded-2xl mb-6 animate-pulse">
          <div className="flex items-center">
            <span className="text-lg mr-2">⚠️</span>
            <span>{error}</span>
            <button 
              onClick={() => setError('')}
              className="ml-auto text-red-800 hover:text-red-900 font-bold"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {success && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-6 py-4 rounded-2xl mb-6 animate-bounce">
          <div className="flex items-center">
            <span className="text-lg mr-2">✅</span>
            <span>{success}</span>
            <button 
              onClick={() => setSuccess('')}
              className="ml-auto text-green-800 hover:text-green-900 font-bold"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* فرم پروفایل منیجر */}
      {showManagerProfile && (
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-8 border border-purple-200 animate-slideIn">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-2xl font-semibold text-gray-800">
              👑 Manager Profile
            </h3>
            <button
              onClick={cancelManagerEdit}
              className="text-gray-400 hover:text-gray-600 text-2xl"
            >
              ×
            </button>
          </div>
          
          <form onSubmit={handleUpdateManagerProfile} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-gray-700 font-medium mb-3">
                  Username *
                </label>
                <input
                  type="text"
                  value={managerUsername}
                  onChange={(e) => setManagerUsername(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-800"
                  placeholder="Enter username"
                  required
                />
              </div>

              <div>
                <label className="block text-gray-700 font-medium mb-3">
                  Full Name *
                </label>
                <input
                  type="text"
                  value={managerName}
                  onChange={(e) => setManagerName(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-800"
                  placeholder="Enter full name"
                  required
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center space-x-4 p-4 bg-gray-50 rounded-xl">
                <input
                  type="checkbox"
                  id="managerChangePassword"
                  checked={managerChangePassword}
                  onChange={(e) => setManagerChangePassword(e.target.checked)}
                  className="w-5 h-5 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                />
                <label htmlFor="managerChangePassword" className="text-gray-700 font-medium">
                  Change Password
                </label>
              </div>

              {managerChangePassword && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-purple-50 rounded-xl">
                  <div>
                    <label className="block text-gray-700 font-medium mb-3">
                      Current Password *
                    </label>
                    <input
                      type="password"
                      value={managerCurrentPassword}
                      onChange={(e) => setManagerCurrentPassword(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-800"
                      placeholder="Enter current password"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-gray-700 font-medium mb-3">
                      New Password *
                    </label>
                    <input
                      type="password"
                      value={managerNewPassword}
                      onChange={(e) => setManagerNewPassword(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-800"
                      placeholder="Enter new password"
                      required
                      minLength={6}
                    />
                  </div>

                  <div>
                    <label className="block text-gray-700 font-medium mb-3">
                      Confirm New Password *
                    </label>
                    <input
                      type="password"
                      value={managerConfirmPassword}
                      onChange={(e) => setManagerConfirmPassword(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-800"
                      placeholder="Confirm new password"
                      required
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="flex space-x-4 pt-4">
              <button
                type="submit"
                className="bg-purple-600 hover:bg-purple-700 text-white px-8 py-3 rounded-xl transition-all duration-200 font-semibold shadow-lg hover:shadow-xl"
              >
                💾 Save Profile
              </button>
              <button
                type="button"
                onClick={cancelManagerEdit}
                className="bg-gray-300 hover:bg-gray-400 text-gray-800 px-8 py-3 rounded-xl transition-all duration-200 font-semibold"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* فرم افزودن کاربر جدید */}
      {showAddForm && !editingUser && session?.user?.role === 'manager' && (
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-8 border border-blue-200 animate-slideIn">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-2xl font-semibold text-gray-800">
              🎯 Add New User
            </h3>
            <button
              onClick={cancelAdd}
              className="text-gray-400 hover:text-gray-600 text-2xl"
            >
              ×
            </button>
          </div>
          
          <form onSubmit={handleAddUser} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-gray-700 font-medium mb-3">
                  Username *
                </label>
                <input
                  type="text"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-800"
                  placeholder="Enter username"
                  required
                />
              </div>

              <div>
                <label className="block text-gray-700 font-medium mb-3">
                  Full Name *
                </label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-800"
                  placeholder="Enter full name"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-gray-700 font-medium mb-3">
                  Password *
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-800"
                  placeholder="Enter password"
                  required
                  minLength={6}
                />
                <p className="text-sm text-gray-500 mt-2">Minimum 6 characters</p>
              </div>

              <div className="flex items-center space-x-4 p-4 bg-gray-50 rounded-xl">
                <input
                  type="checkbox"
                  id="addIsActive"
                  checked={newIsActive}
                  onChange={(e) => setNewIsActive(e.target.checked)}
                  className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="addIsActive" className="text-gray-700 font-medium">
                  Allow immediate access
                </label>
              </div>
            </div>

            <div className="flex space-x-4 pt-4">
              <button
                type="submit"
                className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded-xl transition-all duration-200 font-semibold shadow-lg hover:shadow-xl"
              >
                👤 Create User
              </button>
              <button
                type="button"
                onClick={cancelAdd}
                className="bg-gray-300 hover:bg-gray-400 text-gray-800 px-8 py-3 rounded-xl transition-all duration-200 font-semibold"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* فرم ویرایش کاربر */}
      {editingUser && session?.user?.role === 'manager' && (
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-8 border border-blue-200 animate-slideIn">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-2xl font-semibold text-gray-800">
              ✏️ Edit User: <span className="text-blue-600">{editingUser.username}</span>
            </h3>
            <button
              onClick={cancelEdit}
              className="text-gray-400 hover:text-gray-600 text-2xl"
            >
              ×
            </button>
          </div>
          
          <form onSubmit={handleUpdateUser} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-gray-700 font-medium mb-3">
                  Username *
                </label>
                <input
                  type="text"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-800"
                  placeholder="Enter username"
                  required
                />
              </div>

              <div>
                <label className="block text-gray-700 font-medium mb-3">
                  Full Name *
                </label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-800"
                  required
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center space-x-4 p-4 bg-gray-50 rounded-xl">
                <input
                  type="checkbox"
                  id="changePassword"
                  checked={changePassword}
                  onChange={(e) => setChangePassword(e.target.checked)}
                  className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="changePassword" className="text-gray-700 font-medium">
                  Change Password
                </label>
              </div>

              {changePassword && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-blue-50 rounded-xl">
                  <div>
                    <label className="block text-gray-700 font-medium mb-3">
                      New Password *
                    </label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-800"
                      placeholder="Enter new password"
                      required
                      minLength={6}
                    />
                  </div>

                  <div>
                    <label className="block text-gray-700 font-medium mb-3">
                      Confirm Password *
                    </label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-800"
                      placeholder="Confirm new password"
                      required
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center space-x-4 p-4 bg-gray-50 rounded-xl">
              <input
                type="checkbox"
                id="isActive"
                checked={newIsActive}
                onChange={(e) => setNewIsActive(e.target.checked)}
                className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <label htmlFor="isActive" className="text-gray-700 font-medium">
                Allow access to USA Purchase system
              </label>
              <span className={`ml-auto px-3 py-1 rounded-full text-sm font-semibold ${
                newIsActive 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-red-100 text-red-800'
              }`}>
                {newIsActive ? 'ACCESS GRANTED' : 'ACCESS BLOCKED'}
              </span>
            </div>

            <div className="flex space-x-4 pt-4">
              <button
                type="submit"
                className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl transition-all duration-200 font-semibold shadow-lg hover:shadow-xl"
              >
                💾 Save Changes
              </button>
              <button
                type="button"
                onClick={cancelEdit}
                className="bg-gray-300 hover:bg-gray-400 text-gray-800 px-8 py-3 rounded-xl transition-all duration-200 font-semibold"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* لیست کاربران */}
      {session?.user?.role === 'manager' && (
        <div className="bg-white rounded-2xl shadow-xl p-8 border border-blue-200">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-2xl font-semibold text-gray-800">
              📋 User List ({filteredUsers.length})
            </h3>
            <div className="flex items-center space-x-4">
              <span className="bg-blue-100 text-blue-800 px-4 py-2 rounded-xl font-semibold">
                {filteredUsers.filter(u => u.isActive).length} Active
              </span>
              <span className="bg-gray-100 text-gray-800 px-4 py-2 rounded-xl font-semibold">
                {filteredUsers.filter(u => !u.isActive).length} Blocked
              </span>
            </div>
          </div>

          {filteredUsers.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">👥</div>
              <p className="text-gray-500 text-lg mb-4">
                {searchTerm ? 'No users found matching your search' : 'No regular users found'}
              </p>
              <button
                onClick={() => setShowAddForm(true)}
                className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-xl transition-all duration-200 font-semibold"
              >
                + Add First User
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredUsers.map((user) => (
                <div
                  key={user.id}
                  className={`border rounded-2xl p-6 hover:shadow-lg transition-all duration-200 ${
                    user.isActive 
                      ? 'border-green-200 hover:border-green-300 bg-green-50' 
                      : 'border-red-200 hover:border-red-300 bg-red-50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg ${
                        user.isActive 
                          ? 'bg-gradient-to-br from-green-500 to-emerald-400' 
                          : 'bg-gradient-to-br from-red-500 to-orange-400'
                      }`}>
                        {user.username.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-800">{user.username}</h4>
                        <p className="text-gray-600 text-sm">{user.name}</p>
                      </div>
                    </div>
                    
                    <div className={`text-sm font-semibold ${getStatusColor(user.isActive)}`}>
                      {getStatusIcon(user.isActive)} {getStatusText(user.isActive)}
                    </div>
                  </div>

                  <div className="space-y-3 mt-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Created:</span>
                      <span className="text-gray-600">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  <div className="flex space-x-2 mt-6 pt-4 border-t border-gray-200">
                    <button
                      onClick={() => startEditUser(user)}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-xl transition-all duration-200 text-sm font-semibold"
                    >
                      ✏️ Edit
                    </button>
                    
                    <button
                      onClick={() => toggleUserStatus(user)}
                      className={`flex-1 py-2 px-4 rounded-xl transition-all duration-200 text-sm font-semibold ${
                        user.isActive
                          ? 'bg-red-600 hover:bg-red-700 text-white'
                          : 'bg-green-600 hover:bg-green-700 text-white'
                      }`}
                    >
                      {user.isActive ? '🚫 Block' : '✅ Activate'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="text-center text-gray-500 mt-12">
        <p>User Management System • {session?.user?.role === 'manager' ? 'Manager Access' : 'User Access'}</p>
      </div>
    </div>
  );
}