import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../store/authStore';
import { motion } from 'framer-motion';
import '../styles/layout.css';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const navigate = useNavigate();
  const { user, logout } = useAuth((state) => ({
    user: state.user,
    logout: state.logout
  }));

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="layout">
      {/* Sidebar */}
      <motion.div
        className="sidebar"
        initial={{ x: -256 }}
        animate={{ x: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="sidebar-header">
          <div className="sidebar-logo">📊</div>
          <h1 className="sidebar-title">StandartDesk</h1>
        </div>

        <nav className="sidebar-nav">
          <button
            className="nav-item"
            onClick={() => navigate('/dashboard')}
          >
            <span className="nav-icon">📁</span>
            <span className="nav-label">Projects</span>
          </button>

          <button
            className="nav-item"
            onClick={() => navigate('/bot')}
          >
            <span className="nav-icon">🤖</span>
            <span className="nav-label">Bot Assistant</span>
          </button>

          <button
            className="nav-item"
            onClick={() => navigate('/tasks')}
          >
            <span className="nav-icon">📋</span>
            <span className="nav-label">Tasks</span>
          </button>

          <button
            className="nav-item"
            onClick={() => navigate('/sms')}
          >
            <span className="nav-icon">💬</span>
            <span className="nav-label">SMS Admin</span>
          </button>

          {user?.role === 'Admin' && (
            <button
              className="nav-item"
              onClick={() => navigate('/admin')}
            >
              <span className="nav-icon">👨‍💼</span>
              <span className="nav-label">Admin Panel</span>
            </button>
          )}

          <button
            className="nav-item"
            onClick={() => navigate('/settings')}
          >
            <span className="nav-icon">⚙️</span>
            <span className="nav-label">Settings</span>
          </button>
        </nav>

        <div className="sidebar-footer">
          <div className="user-info">
            <div className="user-avatar">{user?.username.charAt(0).toUpperCase()}</div>
            <div className="user-details">
              <p className="user-name">{user?.fullName || user?.username}</p>
              <p className="user-role">{user?.role}</p>
            </div>
          </div>
          <button className="logout-btn" onClick={handleLogout}>
            🚪 Logout
          </button>
        </div>
      </motion.div>

      {/* Main content */}
      <div className="main-content">
        {children}
      </div>
    </div>
  );
};
