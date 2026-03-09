import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TaskDomain, TaskDomainDetail } from '../types';
import '../styles/task-domain-management.css';

export const TaskDomainManagement: React.FC = () => {
  const [domains, setDomains] = useState<TaskDomain[]>([]);
  const [selectedDomain, setSelectedDomain] = useState<TaskDomainDetail | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAccessModal, setShowAccessModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: '#007BFF',
    icon: '📁'
  });
  const [accessFormData, setAccessFormData] = useState({
    userId: 0,
    canView: true,
    canEdit: false,
    canDelete: false,
    isManager: false
  });

  // Fetch all domains
  useEffect(() => {
    fetchDomains();
    fetchAllUsers();
  }, []);

  const fetchDomains = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('authToken');
      const response = await fetch('http://localhost:5000/api/taskdomain', {
        headers: {
          'Authorization': token ? `Bearer ${token}` : ''
        }
      });
      if (response.ok) {
        const data = await response.json();
        setDomains(data);
      } else if (response.status === 401) {
        console.warn('Unauthorized - please log in');
      }
    } catch (error) {
      console.error('Error fetching domains:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllUsers = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch('http://localhost:5000/api/admin/users', {
        headers: {
          'Authorization': token ? `Bearer ${token}` : ''
        }
      });
      if (response.ok) {
        const data = await response.json();
        setAllUsers(data);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const fetchDomainDetail = async (domainId: number) => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`http://localhost:5000/api/taskdomain/${domainId}`, {
        headers: {
          'Authorization': token ? `Bearer ${token}` : ''
        }
      });
      if (response.ok) {
        const data = await response.json();
        setSelectedDomain(data);
      }
    } catch (error) {
      console.error('Error fetching domain detail:', error);
    }
  };

  const handleCreateDomain = async () => {
    if (!formData.name.trim()) {
      alert('Please enter a domain name');
      return;
    }

    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch('http://localhost:5000/api/taskdomain', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description,
          color: formData.color,
          icon: formData.icon
        })
      });

      if (response.ok) {
        await fetchDomains();
        setFormData({ name: '', description: '', color: '#007BFF', icon: '📁' });
        setShowCreateModal(false);
      } else {
        const errorData = await response.json().catch(() => ({ message: 'Error creating domain' }));
        alert(errorData.message || 'Error creating domain');
        console.error('Error response:', response.status, errorData);
      }
    } catch (error) {
      console.error('Error creating domain:', error);
      alert('Error creating domain: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  const handleDeleteDomain = async (domainId: number) => {
    if (!confirm('Are you sure you want to delete this domain?')) {
      return;
    }

    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`http://localhost:5000/api/taskdomain/${domainId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': token ? `Bearer ${token}` : ''
        }
      });

      if (response.ok) {
        await fetchDomains();
        setSelectedDomain(null);
      } else {
        alert('Error deleting domain');
      }
    } catch (error) {
      console.error('Error deleting domain:', error);
      alert('Error deleting domain');
    }
  };

  const handleGrantAccess = async () => {
    if (accessFormData.userId === 0) {
      alert('Please select a user');
      return;
    }

    if (!selectedDomain) {
      return;
    }

    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`http://localhost:5000/api/taskdomain/${selectedDomain.id}/access`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify(accessFormData)
      });

      if (response.ok) {
        await fetchDomainDetail(selectedDomain.id);
        setAccessFormData({
          userId: 0,
          canView: true,
          canEdit: false,
          canDelete: false,
          isManager: false
        });
        setShowAccessModal(false);
      } else {
        const errorData = await response.json().catch(() => ({ message: 'Error granting access' }));
        alert(errorData.message || 'Error granting access');
      }
    } catch (error) {
      console.error('Error granting access:', error);
      alert('Error granting access');
    }
  };

  const handleRevokeAccess = async (accessId: number) => {
    if (!selectedDomain || !confirm('Revoke access?')) {
      return;
    }

    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`http://localhost:5000/api/taskdomain/${selectedDomain.id}/access/${accessId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': token ? `Bearer ${token}` : ''
        }
      });

      if (response.ok) {
        await fetchDomainDetail(selectedDomain.id);
      } else {
        alert('Error revoking access');
      }
    } catch (error) {
      console.error('Error revoking access:', error);
      alert('Error revoking access');
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4 } }
  };

  return (
    <motion.div
      className="task-domain-management"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <motion.div className="domain-header" variants={itemVariants}>
        <h2>📊 Task Domain Management</h2>
        <button
          className="btn-primary"
          onClick={() => setShowCreateModal(true)}
        >
          Create New Domain
        </button>
      </motion.div>

      <div className="domain-container">
        {/* Domains List */}
        <motion.div className="domains-list" variants={itemVariants}>
          <h3>Existing Domains</h3>
          {loading ? (
            <div className="loading">Loading domains...</div>
          ) : domains.length === 0 ? (
            <div className="empty-state">No domains created yet</div>
          ) : (
            <div className="domains-grid">
              {domains.map(domain => (
                <motion.div
                  key={domain.id}
                  className={`domain-card ${selectedDomain?.id === domain.id ? 'active' : ''}`}
                  onClick={() => fetchDomainDetail(domain.id)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="domain-card-header">
                    <div className="domain-icon" style={{ backgroundColor: domain.color }}>
                      {domain.icon || '📁'}
                    </div>
                    <div className="domain-info">
                      <h4>{domain.name}</h4>
                      <p className="task-count">{domain.taskCount} tasks</p>
                    </div>
                  </div>
                  {domain.description && (
                    <p className="domain-description">{domain.description}</p>
                  )}
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Domain Details */}
        <AnimatePresence>
          {selectedDomain && (
            <motion.div
              className="domain-details"
              variants={itemVariants}
              initial="hidden"
              animate="visible"
              exit="hidden"
            >
              <h3>Domain Details</h3>
              <div className="details-content">
                <div className="detail-item">
                  <label>Name:</label>
                  <span>{selectedDomain.name}</span>
                </div>
                {selectedDomain.description && (
                  <div className="detail-item">
                    <label>Description:</label>
                    <span>{selectedDomain.description}</span>
                  </div>
                )}
                <div className="detail-item">
                  <label>Created By:</label>
                  <span>{selectedDomain.createdByUserName}</span>
                </div>
                <div className="detail-item">
                  <label>Created At:</label>
                  <span>{new Date(selectedDomain.createdAt).toLocaleDateString()}</span>
                </div>

                <div className="access-section">
                  <div className="access-header">
                    <h4>User Access</h4>
                    <button
                      className="btn-secondary"
                      onClick={() => setShowAccessModal(true)}
                    >
                      Grant Access
                    </button>
                  </div>

                  {selectedDomain.accessList.length === 0 ? (
                    <div className="empty-state">No users have access</div>
                  ) : (
                    <div className="access-list">
                      {selectedDomain.accessList.map(access => (
                        <div key={access.id} className="access-item">
                          <div className="access-user">
                            <img
                              src={access.avatar || '/default-avatar.png'}
                              alt={access.username}
                              className="user-avatar"
                            />
                            <div>
                              <p className="username">{access.fullName || access.username}</p>
                              <p className="email">{access.username}</p>
                            </div>
                          </div>
                          <div className="access-permissions">
                            {access.isManager && <span className="badge manager">Manager</span>}
                            {access.canEdit && <span className="badge edit">Can Edit</span>}
                            {access.canDelete && <span className="badge delete">Can Delete</span>}
                          </div>
                          <button
                            className="btn-remove"
                            onClick={() => handleRevokeAccess(access.id)}
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <button
                  className="btn-danger"
                  onClick={() => handleDeleteDomain(selectedDomain.id)}
                >
                  Delete Domain
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Create Domain Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <motion.div
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowCreateModal(false)}
          >
            <motion.div
              className="modal-content"
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              onClick={e => e.stopPropagation()}
            >
              <h3>Create New Task Domain</h3>
              <div className="form-group">
                <label>Domain Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., DS_STANDART"
                />
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  placeholder="What is this domain for?"
                  rows={3}
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Color</label>
                  <input
                    type="color"
                    value={formData.color}
                    onChange={e => setFormData({ ...formData, color: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Icon</label>
                  <input
                    type="text"
                    value={formData.icon}
                    onChange={e => setFormData({ ...formData, icon: e.target.value })}
                    placeholder="Emoji or icon"
                    maxLength={2}
                  />
                </div>
              </div>
              <div className="modal-actions">
                <button
                  className="btn-secondary"
                  onClick={() => setShowCreateModal(false)}
                >
                  Cancel
                </button>
                <button
                  className="btn-primary"
                  onClick={handleCreateDomain}
                >
                  Create Domain
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Grant Access Modal */}
      <AnimatePresence>
        {showAccessModal && (
          <motion.div
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowAccessModal(false)}
          >
            <motion.div
              className="modal-content"
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              onClick={e => e.stopPropagation()}
            >
              <h3>Grant Domain Access</h3>
              <div className="form-group">
                <label>User *</label>
                <select
                  value={accessFormData.userId}
                  onChange={e => setAccessFormData({ ...accessFormData, userId: parseInt(e.target.value) })}
                >
                  <option value={0}>Select a user...</option>
                  {allUsers.map(user => (
                    <option key={user.id} value={user.id}>
                      {user.fullName || user.username}
                    </option>
                  ))}
                </select>
              </div>
              <div className="permissions-group">
                <label>Permissions</label>
                <div className="checkbox-group">
                  <label>
                    <input
                      type="checkbox"
                      checked={accessFormData.canView}
                      onChange={e => setAccessFormData({ ...accessFormData, canView: e.target.checked })}
                    />
                    Can View
                  </label>
                  <label>
                    <input
                      type="checkbox"
                      checked={accessFormData.canEdit}
                      onChange={e => setAccessFormData({ ...accessFormData, canEdit: e.target.checked })}
                    />
                    Can Edit
                  </label>
                  <label>
                    <input
                      type="checkbox"
                      checked={accessFormData.canDelete}
                      onChange={e => setAccessFormData({ ...accessFormData, canDelete: e.target.checked })}
                    />
                    Can Delete
                  </label>
                  <label>
                    <input
                      type="checkbox"
                      checked={accessFormData.isManager}
                      onChange={e => setAccessFormData({ ...accessFormData, isManager: e.target.checked })}
                    />
                    Is Manager
                  </label>
                </div>
              </div>
              <div className="modal-actions">
                <button
                  className="btn-secondary"
                  onClick={() => setShowAccessModal(false)}
                >
                  Cancel
                </button>
                <button
                  className="btn-primary"
                  onClick={handleGrantAccess}
                >
                  Grant Access
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
