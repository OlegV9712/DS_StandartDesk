import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../store/authStore';
import { TaskDomainManagement } from '../components/TaskDomainManagement';
import '../styles/admin.css';

interface User {
  id: number;
  username: string;
  email: string;
  fullName?: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  lastLoginAt?: string;
}

interface Stats {
  totalUsers: number;
  totalProjects: number;
  totalPages: number;
  totalBlockSchemas: number;
  totalAuditLogs: number;
  activeUsers: number;
  lastLoginUsers: Array<{ username: string; lastLoginAt: string }>;
}

interface AuditLog {
  id: number;
  action: string;
  entityType: string;
  user?: { username: string; email: string };
  project?: { name: string };
  createdAt: string;
  oldValue?: string;
  newValue?: string;
}

export const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [logsLoading, setLogsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'stats' | 'users' | 'logs' | 'tasks' | 'settings'>('stats');
  const [showCreateUserModal, setShowCreateUserModal] = useState(false);
  const [newUser, setNewUser] = useState({ username: '', email: '', password: '', fullName: '', role: 2 });
  const [maintenanceMode, setMaintenanceMode] = useState(localStorage.getItem('maintenanceMode') === 'true');
  const [showNotification, setShowNotification] = useState(false);
  const authUser = useAuth((state) => state.user);
  const token = useAuth((state) => state.user?.token);

  useEffect(() => {
    fetchStats();
    fetchUsers();
  }, []);

  // Fetch logs when switching to logs tab
  useEffect(() => {
    if (activeTab === 'logs') {
      fetchLogs();
    }
  }, [activeTab]);

  const fetchStats = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/admin/stats', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        setStats(await response.json());
      }
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  };

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:5000/api/admin/users', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        setUsers(await response.json());
      }
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchLogs = async () => {
    try {
      setLogsLoading(true);
      const response = await fetch('http://localhost:5000/api/admin/logs?page=1&pageSize=100', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setLogs(data.items || []);
      }
    } catch (err) {
      console.error('Error fetching logs:', err);
    } finally {
      setLogsLoading(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('http://localhost:5000/api/admin/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(newUser)
      });

      if (response.ok) {
        setShowCreateUserModal(false);
        setNewUser({ username: '', email: '', password: '', fullName: '', role: 2 });
        fetchUsers();
      } else {
        const data = await response.json();
        alert(`Error: ${data.message}`);
      }
    } catch (err) {
      console.error('Error creating user:', err);
    }
  };

  if (!authUser || authUser.role !== 'Admin') {
    return (
      <div className="admin-error">
        <h2>❌ Access Denied</h2>
        <p>Only administrators can access this page.</p>
      </div>
    );
  }

  return (
    <div className="admin-dashboard">
      {/* Header */}
      <div className="admin-header">
        <h1>👨‍💼 Admin Dashboard</h1>
        <p>Welcome, {authUser.fullName || authUser.username}!</p>
      </div>

      {/* Tabs */}
      <div className="admin-tabs">
        <button
          className={`admin-tab ${activeTab === 'stats' ? 'active' : ''}`}
          onClick={() => setActiveTab('stats')}
        >
          📊 Statistics
        </button>
        <button
          className={`admin-tab ${activeTab === 'users' ? 'active' : ''}`}
          onClick={() => setActiveTab('users')}
        >
          👥 Users
        </button>
        <button
          className={`admin-tab ${activeTab === 'tasks' ? 'active' : ''}`}
          onClick={() => setActiveTab('tasks')}
        >
          📋 Task Domains
        </button>
        <button
          className={`admin-tab ${activeTab === 'logs' ? 'active' : ''}`}
          onClick={() => setActiveTab('logs')}
        >
          📋 Logs
        </button>
        <button
          className={`admin-tab ${activeTab === 'settings' ? 'active' : ''}`}
          onClick={() => setActiveTab('settings')}
        >
          ⚙️ Settings
        </button>
      </div>

      {/* Content */}
      <div className="admin-content">
        {/* Stats Tab */}
        {activeTab === 'stats' && stats && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="admin-stats"
          >
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-icon">👥</div>
                <div className="stat-info">
                  <h3>Total Users</h3>
                  <p className="stat-value">{stats.totalUsers}</p>
                  <p className="stat-sub">Active: {stats.activeUsers}</p>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon">📁</div>
                <div className="stat-info">
                  <h3>Projects</h3>
                  <p className="stat-value">{stats.totalProjects}</p>
                  <p className="stat-sub">Pages: {stats.totalPages}</p>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon">📊</div>
                <div className="stat-info">
                  <h3>Block Schemas</h3>
                  <p className="stat-value">{stats.totalBlockSchemas}</p>
                  <p className="stat-sub">Diagrams</p>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon">📝</div>
                <div className="stat-info">
                  <h3>Audit Logs</h3>
                  <p className="stat-value">{stats.totalAuditLogs}</p>
                  <p className="stat-sub">Actions tracked</p>
                </div>
              </div>
            </div>

            <div className="recent-activity">
              <h3>🔔 Recent Logins</h3>
              <div className="activity-list">
                {stats.lastLoginUsers.map((item, idx) => (
                  <div key={idx} className="activity-item">
                    <span className="activity-user">{item.username}</span>
                    <span className="activity-time">
                      {new Date(item.lastLoginAt).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="admin-users"
          >
            <div className="users-header">
              <h2>User Management</h2>
              <button className="btn-primary" onClick={() => setShowCreateUserModal(true)}>
                ➕ Create User
              </button>
            </div>

            {loading ? (
              <div className="loading">Loading users...</div>
            ) : (
              <div className="users-table">
                <div className="table-header">
                  <div className="col-username">Username</div>
                  <div className="col-email">Email</div>
                  <div className="col-role">Role</div>
                  <div className="col-status">Status</div>
                  <div className="col-created">Created</div>
                  <div className="col-actions">Actions</div>
                </div>
                {users.map((user) => (
                  <div key={user.id} className="table-row">
                    <div className="col-username">
                      <span className="user-avatar">{user.username.charAt(0).toUpperCase()}</span>
                      {user.fullName || user.username}
                    </div>
                    <div className="col-email">{user.email}</div>
                    <div className="col-role">
                      <span className={`role-badge role-${user.role.toLowerCase()}`}>
                        {user.role}
                      </span>
                    </div>
                    <div className="col-status">
                      <span className={`status-badge ${user.isActive ? 'active' : 'inactive'}`}>
                        {user.isActive ? '✅ Active' : '⛔ Inactive'}
                      </span>
                    </div>
                    <div className="col-created">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </div>
                    <div className="col-actions">
                      <button className="btn-small">Edit</button>
                      <button className="btn-small btn-danger">Delete</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* Task Domains Tab */}
        {activeTab === 'tasks' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="admin-tasks"
          >
            <TaskDomainManagement />
          </motion.div>
        )}

        {/* Logs Tab */}
        {activeTab === 'logs' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="admin-logs"
          >
            <h2>📋 Audit Logs</h2>
            {logsLoading ? (
              <div className="loading">Loading logs...</div>
            ) : logs.length === 0 ? (
              <div className="empty-state">
                <p>No audit logs found</p>
              </div>
            ) : (
              <div className="logs-table">
                <div className="table-header">
                  <div className="col-action">Action</div>
                  <div className="col-entity">Entity</div>
                  <div className="col-user">User</div>
                  <div className="col-timestamp">Timestamp</div>
                  <div className="col-details">Details</div>
                </div>
                {logs.map((log) => (
                  <div key={log.id} className="table-row">
                    <div className="col-action">
                      <span className={`action-badge action-${log.action.toLowerCase()}`}>
                        {log.action}
                      </span>
                    </div>
                    <div className="col-entity">{log.entityType}</div>
                    <div className="col-user">
                      {log.user?.username || 'System'}
                    </div>
                    <div className="col-timestamp">
                      {new Date(log.createdAt).toLocaleString()}
                    </div>
                    <div className="col-details">
                      <span title={log.newValue || ''}>
                        {log.newValue ? JSON.stringify(log.newValue).substring(0, 50) + '...' : '-'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="admin-settings"
          >
            <h2>⚙️ Site Settings</h2>
            
            <div className="settings-section">
              <div className="setting-item">
                <div className="setting-info">
                  <h3>Maintenance Mode</h3>
                  <p className="setting-description">
                    When enabled, all sections will show a maintenance message. Perfect for updates!
                  </p>
                </div>

                <div className={`toggle-switch ${maintenanceMode ? 'active' : ''}`}>
                  <motion.button
                    className="toggle-button"
                    onClick={() => {
                      const newValue = !maintenanceMode;
                      setMaintenanceMode(newValue);
                      localStorage.setItem('maintenanceMode', String(newValue));
                      setShowNotification(true);
                      setTimeout(() => setShowNotification(false), 3000);
                    }}
                    type="button"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <motion.span
                      className="toggle-circle"
                      animate={{
                        x: maintenanceMode ? 34 : 0,
                      }}
                      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                    />
                  </motion.button>
                  <span className="status-text">
                    {maintenanceMode ? '🟢 ON' : '🔴 OFF'}
                  </span>
                </div>
              </div>

              {maintenanceMode && (
                <motion.div 
                  className="maintenance-preview" 
                  initial={{ opacity: 0, height: 0 }} 
                  animate={{ opacity: 1, height: 'auto' }}
                >
                  <p className="preview-label">Preview - Users will see:</p>
                  <p className="preview-text">
                    "Ухххх ты, наш разработчик что-то совсем разошелся и скоро обновит тут все! Поэтому ничего не работает, но вы подождите немного, выпейте кофейку или чая, отдохните и вернитесь позднее 😊"
                  </p>
                </motion.div>
              )}
            </div>
          </motion.div>
        )}
      </div>

      {/* Create User Modal */}
      {showCreateUserModal && (
        <div className="modal-overlay" onClick={() => setShowCreateUserModal(false)}>
          <motion.div
            className="modal"
            onClick={(e) => e.stopPropagation()}
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
          >
            <h2>Create New User</h2>
            <form onSubmit={handleCreateUser}>
              <input
                type="text"
                placeholder="Username"
                value={newUser.username}
                onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                required
              />
              <input
                type="email"
                placeholder="Email"
                value={newUser.email}
                onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                required
              />
              <input
                type="password"
                placeholder="Password"
                value={newUser.password}
                onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                required
              />
              <input
                type="text"
                placeholder="Full Name"
                value={newUser.fullName}
                onChange={(e) => setNewUser({ ...newUser, fullName: e.target.value })}
              />
              <select
                value={newUser.role}
                onChange={(e) => setNewUser({ ...newUser, role: parseInt(e.target.value) })}
              >
                <option value={0}>Admin</option>
                <option value={1}>Manager</option>
                <option value={2}>User</option>
                <option value={3}>Guest</option>
              </select>
              <div className="modal-buttons">
                <button type="submit" className="btn-primary">Create</button>
                <button type="button" onClick={() => setShowCreateUserModal(false)} className="btn-secondary">
                  Cancel
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {showNotification && (
        <motion.div
          className="notification"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
        >
          ✅ Maintenance mode {maintenanceMode ? 'enabled' : 'disabled'}
        </motion.div>
      )}
    </div>
  );
};
