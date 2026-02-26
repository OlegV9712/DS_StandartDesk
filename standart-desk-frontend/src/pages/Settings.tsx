import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../store/authStore';
import { apiService } from '../services/api';
import '../styles/settings.css';

interface UserSettings {
  fullName: string;
  status: 'Active' | 'Inactive';
  theme: 'light' | 'dark';
  avatar: string;
}

export const Settings: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth((state) => ({
    user: state.user,
    logout: state.logout
  }));

  const [settings, setSettings] = useState<UserSettings>({
    fullName: user?.fullName || '',
    status: 'Active',
    theme: (localStorage.getItem('theme') as 'light' | 'dark') || 'light',
    avatar: user?.avatar || '👤'
  });

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [avatarOptions] = useState([
    '👤', '👨', '👩', '🧑', '👨‍💼', '👩‍💼', '👨‍🏫', '👩‍🏫',
    '👨‍⚕️', '👩‍⚕️', '👨‍🍳', '👩‍🍳', '🐱', '🐶', '🐻', '🦁'
  ]);

  useEffect(() => {
    if (!user) {
      navigate('/login');
    }
    // Apply saved theme on component mount
    const savedTheme = localStorage.getItem('theme') || 'light';
    applyTheme(savedTheme as 'light' | 'dark');
  }, [user, navigate]);

  const applyTheme = (theme: 'light' | 'dark') => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark-theme');
    } else {
      document.documentElement.classList.remove('dark-theme');
    }
  };

  const handleThemeChange = (theme: 'light' | 'dark') => {
    setSettings({ ...settings, theme });
    localStorage.setItem('theme', theme);
    applyTheme(theme);
  };

  const handleStatusChange = (status: 'Active' | 'Inactive') => {
    setSettings({ ...settings, status });
  };

  const handleAvatarChange = (avatar: string) => {
    setSettings({ ...settings, avatar });
  };

  const handleSaveSettings = async () => {
    setLoading(true);
    try {
      if (!user?.id) {
        alert('❌ User ID not found');
        return;
      }

      console.log('[SETTINGS] Saving user settings:', {
        fullName: settings.fullName,
        avatar: settings.avatar,
        status: settings.status
      });

      try {
        const response = await apiService.updateUserSettings(
          user.id,
          settings.fullName,
          settings.avatar,
          settings.status
        );

        console.log('[SETTINGS] Save response:', response.status);

        if (response.status === 200) {
          console.log('[SETTINGS] Settings saved successfully:', response.data);
          setSuccess(true);
          setTimeout(() => setSuccess(false), 3000);
        } else {
          console.error('[SETTINGS] Save failed:', response.status);
          alert('❌ Ошибка при сохранении настроек');
        }
      } catch (apiErr: any) {
        console.error('[SETTINGS] API error:', apiErr);
        if (apiErr.response?.status === 401) {
          alert('❌ Session expired - please login again');
        } else {
          const errorMsg = apiErr.response?.data?.message || apiErr.message || 'Unknown error';
          alert('❌ Ошибка при сохранении настроек: ' + errorMsg);
        }
      }
    } catch (err: any) {
      console.error('[SETTINGS] Error saving settings:', err);
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      alert('❌ Ошибка при сохранении настроек: ' + errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (!user) return <div>Загрузка...</div>;

  return (
    <div className="settings-container">
      <div className="settings-card">
        <h1 className="settings-title">⚙️ Настройки профиля</h1>

        {success && (
          <div className="success-message">
            ✅ Настройки сохранены успешно!
          </div>
        )}

        {/* Personal Information Section */}
        <section className="settings-section">
          <h2>👤 Личная информация</h2>
          
          <div className="settings-field">
            <label>Полное имя:</label>
            <input
              type="text"
              value={settings.fullName}
              onChange={(e) => setSettings({ ...settings, fullName: e.target.value })}
              placeholder="Введите ваше полное имя"
              className="settings-input"
            />
          </div>

          <div className="settings-field">
            <label>Имя пользователя (не изменяется):</label>
            <input
              type="text"
              value={user.username}
              disabled
              className="settings-input disabled"
            />
          </div>

          <div className="settings-field">
            <label>Email:</label>
            <input
              type="email"
              value={user.email || ''}
              disabled
              className="settings-input disabled"
            />
          </div>
        </section>

        {/* Avatar Selection */}
        <section className="settings-section">
          <h2>😊 Выберите аватар</h2>
          <div className="avatar-grid">
            {avatarOptions.map((emoji) => (
              <button
                key={emoji}
                className={`avatar-option ${settings.avatar === emoji ? 'active' : ''}`}
                onClick={() => handleAvatarChange(emoji)}
              >
                <span className="avatar-emoji">{emoji}</span>
              </button>
            ))}
          </div>
          <div className="current-avatar">
            Ваш аватар: <span className="avatar-display">{settings.avatar}</span>
          </div>
        </section>

        {/* Status Selection */}
        <section className="settings-section">
          <h2>📊 Статус</h2>
          <div className="status-options">
            <label className="status-option">
              <input
                type="radio"
                name="status"
                value="Active"
                checked={settings.status === 'Active'}
                onChange={(e) => handleStatusChange(e.target.value as 'Active' | 'Inactive')}
              />
              <span className="status-label">
                <span className="status-badge active">●</span> Активен
              </span>
            </label>
            <label className="status-option">
              <input
                type="radio"
                name="status"
                value="Inactive"
                checked={settings.status === 'Inactive'}
                onChange={(e) => handleStatusChange(e.target.value as 'Active' | 'Inactive')}
              />
              <span className="status-label">
                <span className="status-badge inactive">●</span> Неактивен
              </span>
            </label>
          </div>
        </section>

        {/* Theme Selection */}
        <section className="settings-section">
          <h2>🎨 Тема оформления</h2>
          <div className="theme-options">
            <button
              className={`theme-option ${settings.theme === 'light' ? 'active' : ''}`}
              onClick={() => handleThemeChange('light')}
            >
              <span className="theme-icon">☀️</span>
              <span>Светлая</span>
            </button>
            <button
              className={`theme-option ${settings.theme === 'dark' ? 'active' : ''}`}
              onClick={() => handleThemeChange('dark')}
            >
              <span className="theme-icon">🌙</span>
              <span>Тёмная</span>
            </button>
          </div>
        </section>

        {/* Account Information */}
        <section className="settings-section account-info">
          <h2>ℹ️ Информация об аккаунте</h2>
          <div className="info-grid">
            <div className="info-item">
              <label>Роль:</label>
              <span className="info-value">{user.role}</span>
            </div>
            <div className="info-item">
              <label>Дата создания:</label>
              <span className="info-value">
                {user.createdAt ? new Date(user.createdAt).toLocaleDateString('ru-RU') : 'N/A'}
              </span>
            </div>
            <div className="info-item">
              <label>Последний вход:</label>
              <span className="info-value">
                {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleDateString('ru-RU') : 'Первый вход'}
              </span>
            </div>
          </div>
        </section>

        {/* Action Buttons */}
        <div className="settings-actions">
          <button
            onClick={handleSaveSettings}
            disabled={loading}
            className="btn btn-primary"
          >
            {loading ? '💾 Сохранение...' : '💾 Сохранить настройки'}
          </button>
          <button
            onClick={handleLogout}
            className="btn btn-secondary"
          >
            🚪 Выход
          </button>
        </div>
      </div>
    </div>
  );
};
