import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../store/authStore';
import '../styles/admin.css';

interface AdminSettings {
  maintenanceMode: boolean;
}

export const AdminPanel: React.FC = () => {
  const navigate = useNavigate();
  const user = useAuth((state) => state.user);
  const [settings, setSettings] = useState<AdminSettings>({
    maintenanceMode: localStorage.getItem('maintenanceMode') === 'true',
  });
  const [showNotification, setShowNotification] = useState(false);

  // Check if user is admin
  useEffect(() => {
    if (!user || user.role !== 'Admin') {
      navigate('/');
    }
  }, [user, navigate]);

  const toggleMaintenanceMode = () => {
    const newValue = !settings.maintenanceMode;
    setSettings({ ...settings, maintenanceMode: newValue });
    localStorage.setItem('maintenanceMode', String(newValue));
    setShowNotification(true);
    setTimeout(() => setShowNotification(false), 3000);
  };

  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: { opacity: 1, x: 0, transition: { duration: 0.4 } },
  };

  return (
    <div className="admin-panel">
      <motion.div
        className="admin-container"
        initial="hidden"
        animate="visible"
        variants={containerVariants}
      >
        <motion.h1 className="admin-title" variants={itemVariants}>
          🔧 Admin Panel
        </motion.h1>

        <motion.div className="admin-section" variants={itemVariants}>
          <h2 className="section-title">⚙️ Site Settings</h2>

          <div className="setting-item">
            <div className="setting-info">
              <h3>Maintenance Mode</h3>
              <p className="setting-description">
                When enabled, all sections will show a maintenance message instead of content.
                Perfect for updates and deployments!
              </p>
            </div>

            <div className={`toggle-switch ${settings.maintenanceMode ? 'active' : ''}`}>
              <motion.button
                className="toggle-button"
                onClick={toggleMaintenanceMode}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <motion.span
                  className="toggle-circle"
                  animate={{
                    x: settings.maintenanceMode ? 34 : 0,
                  }}
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
              </motion.button>
              <span className="status-text">
                {settings.maintenanceMode ? '🟢 ON' : '🔴 OFF'}
              </span>
            </div>
          </div>

          {settings.maintenanceMode && (
            <motion.div className="maintenance-preview" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
              <p className="preview-label">Preview - This is what users will see:</p>
              <p className="preview-text">
                "Ухххх ты, наш разработчик что-то совсем разошелся и скоро обновит тут все! Поэтому ничего не работает, но вы подождите немного, выпейте кофейку или чая, отдохните и вернитесь позднее 😊"
              </p>
            </motion.div>
          )}
        </motion.div>

        <motion.div className="admin-section" variants={itemVariants}>
          <h2 className="section-title">👤 User Information</h2>
          <div className="user-info">
            <p>
              <strong>Username:</strong> {user?.username}
            </p>
            <p>
              <strong>Email:</strong> {user?.email}
            </p>
            <p>
              <strong>Role:</strong> <span className="role-badge">👑 {user?.role}</span>
            </p>
          </div>
        </motion.div>

        <motion.div className="admin-section" variants={itemVariants}>
          <h2 className="section-title">📊 System Information</h2>
          <div className="system-info">
            <p>
              <strong>Backend:</strong> ASP.NET Core 9.0
            </p>
            <p>
              <strong>Frontend:</strong> React 18 + TypeScript
            </p>
            <p>
              <strong>Database:</strong> SQLite
            </p>
            <p>
              <strong>Version:</strong> 1.0.0
            </p>
          </div>
        </motion.div>
      </motion.div>

      {showNotification && (
        <motion.div
          className="notification"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
        >
          ✅ Maintenance mode {settings.maintenanceMode ? 'enabled' : 'disabled'}
        </motion.div>
      )}
    </div>
  );
};

export default AdminPanel;
