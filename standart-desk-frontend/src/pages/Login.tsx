import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../store/authStore';
import { apiService } from '../services/api';
import '../styles/auth.css';

export const Login: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const login = useAuth((state: any) => state.login);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      console.log('[LOGIN] Attempting login for:', username);
      const response = await apiService.login(username, password);
      const data = response.data;

      console.log('[LOGIN] Login successful, redirecting to dashboard');
      // Save auth data
      login(data);
      navigate('/dashboard');
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Login failed';
      setError(errorMessage);
      console.error('[LOGIN] Error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      {/* Background gradient */}
      <div className="auth-bg-gradient"></div>

      {/* Animated background elements */}
      <motion.div className="auth-orb auth-orb-1" animate={{ y: [0, 20, 0] }} transition={{ duration: 4, repeat: Infinity }} />
      <motion.div className="auth-orb auth-orb-2" animate={{ y: [0, -20, 0] }} transition={{ duration: 5, repeat: Infinity }} />

      {/* Login card */}
      <motion.div
        className="auth-card"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
      >
        {/* Header */}
        <div className="auth-header">
          <motion.div className="auth-logo" initial={{ rotate: -10 }} animate={{ rotate: 0 }} transition={{ duration: 0.6 }}>
            📊
          </motion.div>
          <h1 className="auth-title">StandartDesk</h1>
          <p className="auth-subtitle">Professional Diagramming & Process Management</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="auth-form">
          {/* Username field */}
          <motion.div
            className="auth-field"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <label htmlFor="username" className="auth-label">Username</label>
            <div className="auth-input-group">
              <span className="auth-input-icon">👤</span>
              <input
                id="username"
                type="text"
                placeholder="Enter your username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="auth-input"
                disabled={loading}
              />
            </div>
          </motion.div>

          {/* Password field */}
          <motion.div
            className="auth-field"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
          >
            <label htmlFor="password" className="auth-label">Password</label>
            <div className="auth-input-group">
              <span className="auth-input-icon">🔐</span>
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="auth-input"
                disabled={loading}
              />
              <button
                type="button"
                className="auth-toggle-password"
                onClick={() => setShowPassword(!showPassword)}
                disabled={loading}
              >
                {showPassword ? '👁️' : '👁️‍🗨️'}
              </button>
            </div>
          </motion.div>

          {/* Error message */}
          {error && (
            <motion.div
              className="auth-error"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              ⚠️ {error}
            </motion.div>
          )}

          {/* Submit button */}
          <motion.button
            type="submit"
            className="auth-button"
            disabled={loading}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            {loading ? (
              <>
                <span className="spinner"></span>
                Logging in...
              </>
            ) : (
              'Sign In'
            )}
          </motion.button>


        </form>

        {/* Footer */}
        <div className="auth-footer">
          <p className="auth-footer-text">
            Built with ❤️ | StandartDesk MVP 2026
          </p>
        </div>
      </motion.div>

      {/* Floating shapes */}
      <motion.div className="auth-shape auth-shape-1" animate={{ rotate: 360 }} transition={{ duration: 20, repeat: Infinity }} />
      <motion.div className="auth-shape auth-shape-2" animate={{ rotate: -360 }} transition={{ duration: 30, repeat: Infinity }} />
    </div>
  );
};
