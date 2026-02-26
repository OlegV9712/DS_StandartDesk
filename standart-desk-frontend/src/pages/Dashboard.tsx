import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../store/authStore';
import '../styles/dashboard.css';

interface Project {
  id: number;
  name: string;
  description?: string;
  ownerName: string;
  createdAt: string;
  updatedAt?: string;
  isArchived: boolean;
  pages: any[];
}

export const Dashboard: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newProject, setNewProject] = useState({ name: '', description: '' });
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const user = useAuth((state) => state.user);
  const token = useAuth((state) => state.user?.token);

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const response = await fetch(`http://localhost:5000/api/projects?userId=${user?.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setProjects(data);
      } else {
        console.error('Failed to fetch projects:', response.statusText);
      }
    } catch (err) {
      console.error('Error fetching projects:', err);
      setError('Failed to load projects');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!newProject.name.trim()) {
      setError('Project name is required');
      return;
    }

    try {
      const response = await fetch(`http://localhost:5000/api/projects?userId=${user?.id}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: newProject.name,
          description: newProject.description
        })
      });

      if (response.ok) {
        const createdProject = await response.json();
        setProjects([...projects, createdProject]);
        setShowCreateModal(false);
        setNewProject({ name: '', description: '' });
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Failed to create project');
      }
    } catch (err) {
      console.error('Error creating project:', err);
      setError('Connection error');
    }
  };

  const handleOpenProject = (projectId: number) => {
    navigate(`/project/${projectId}`);
  };

  const handleDeleteProject = async (projectId: number) => {
    if (!confirm('Are you sure you want to delete this project?')) {
      return;
    }

    try {
      const response = await fetch(`http://localhost:5000/api/projects/${projectId}?userId=${user?.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        setProjects(projects.filter(p => p.id !== projectId));
      }
    } catch (err) {
      console.error('Error deleting project:', err);
    }
  };

  return (
    <div className="dashboard">
      {/* Header */}
      <div className="dashboard-header">
        <div className="header-content">
          <h1 className="dashboard-title">📁 My Projects</h1>
          <p className="dashboard-subtitle">Welcome back, {user?.fullName || user?.username}!</p>
        </div>
        <button
          className="btn-create"
          onClick={() => setShowCreateModal(true)}
        >
          ➕ New Project
        </button>
      </div>

      {/* Error message */}
      {error && (
        <motion.div
          className="dashboard-error"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          ⚠️ {error}
          <button onClick={() => setError('')} className="error-close">✕</button>
        </motion.div>
      )}

      {/* Projects grid */}
      <div className="projects-container">
        {loading ? (
          <div className="loading-message">
            <span className="spinner"></span>
            Loading projects...
          </div>
        ) : projects.length === 0 ? (
          <motion.div
            className="empty-state"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <div className="empty-icon">📭</div>
            <h2>No projects yet</h2>
            <p>Create your first project to get started</p>
            <button
              className="btn-primary"
              onClick={() => setShowCreateModal(true)}
            >
              Create Project
            </button>
          </motion.div>
        ) : (
          <motion.div
            className="projects-grid"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            {projects.map((project, index) => (
              <motion.div
                key={project.id}
                className="project-card"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                whileHover={{ y: -4 }}
              >
                <div className="project-header">
                  <div className="project-icon">📊</div>
                  <div className="project-meta">
                    <span className="project-pages">{project.pages?.length || 0} pages</span>
                  </div>
                </div>

                <h3 className="project-name">{project.name}</h3>

                {project.description && (
                  <p className="project-description">{project.description}</p>
                )}

                <div className="project-footer">
                  <div className="project-info">
                    <span className="info-label">Created:</span>
                    <span className="info-value">
                      {new Date(project.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                <div className="project-actions">
                  <button
                    className="action-btn action-open"
                    onClick={() => handleOpenProject(project.id)}
                  >
                    🔓 Open
                  </button>
                  <button
                    className="action-btn action-delete"
                    onClick={() => handleDeleteProject(project.id)}
                  >
                    🗑️ Delete
                  </button>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>

      {/* Create project modal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <motion.div
            className="modal"
            onClick={(e) => e.stopPropagation()}
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
          >
            <h2 className="modal-title">📁 Create New Project</h2>
            <form onSubmit={handleCreateProject}>
              <div className="form-group">
                <label htmlFor="name">Project Name *</label>
                <input
                  id="name"
                  type="text"
                  placeholder="Enter project name"
                  value={newProject.name}
                  onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
                  className="form-input"
                  autoFocus
                />
              </div>

              <div className="form-group">
                <label htmlFor="description">Description</label>
                <textarea
                  id="description"
                  placeholder="Enter project description (optional)"
                  value={newProject.description}
                  onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                  className="form-input form-textarea"
                  rows={4}
                />
              </div>

              <div className="modal-actions">
                <button type="submit" className="btn-primary">
                  Create Project
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setShowCreateModal(false)}
                >
                  Cancel
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
};
