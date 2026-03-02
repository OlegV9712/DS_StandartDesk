import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../store/authStore';
import { apiService } from '../services/api';
import { ProjectTypeModal } from '../components/ProjectTypeModal';
import { Folder, Project } from '../types';
import '../styles/dashboard.css';

export const Dashboard: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [loading, setLoading] = useState(true);
  const [showTypeModal, setShowTypeModal] = useState(false);
  const [selectedFolderId, setSelectedFolderId] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [expandedFolders, setExpandedFolders] = useState<Set<number>>(new Set());
  const [renamingFolderId, setRenamingFolderId] = useState<number | null>(null);
  const [renamingName, setRenamingName] = useState('');
  const [showNewFolderInput, setShowNewFolderInput] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [draggedProjectId, setDraggedProjectId] = useState<number | null>(null);
  const [projectName, setProjectName] = useState('');
  const [projectDescription, setProjectDescription] = useState('');
  const navigate = useNavigate();
  const user = useAuth((state) => state.user);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [projectsRes, foldersRes] = await Promise.all([
        apiService.getProjects(user?.id || 1),
        apiService.getFolders(user?.id || 1)
      ]);
      setProjects(projectsRes.data);
      setFolders(foldersRes.data);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Failed to load projects');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProject = async (type: 'algorithm' | 'assistant_bot', name: string, description: string) => {
    try {
      const typeValue = type === 'algorithm' ? 0 : 1;
      await apiService.createProject(name, description, typeValue, selectedFolderId || undefined, user?.id || 1);
      setShowTypeModal(false);
      setProjectName('');
      setProjectDescription('');
      await fetchData();
    } catch (err) {
      console.error('Error creating project:', err);
      setError('Failed to create project');
    }
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    try {
      await apiService.createFolder(newFolderName, undefined, user?.id || 1);
      setNewFolderName('');
      setShowNewFolderInput(false);
      await fetchData();
    } catch (err) {
      console.error('Error creating folder:', err);
      setError('Failed to create folder');
    }
  };

  const handleRenameFolder = async (folderId: number) => {
    if (!renamingName.trim()) {
      setRenamingFolderId(null);
      return;
    }
    try {
      await apiService.updateFolder(folderId, renamingName);
      setRenamingFolderId(null);
      await fetchData();
    } catch (err) {
      console.error('Error renaming folder:', err);
      setError('Failed to rename folder');
    }
  };

  const handleDeleteFolder = async (folderId: number) => {
    if (!window.confirm('Delete this folder? Projects will be moved to root.')) return;
    try {
      await apiService.deleteFolder(folderId);
      await fetchData();
    } catch (err) {
      console.error('Error deleting folder:', err);
      setError('Failed to delete folder');
    }
  };

  const handleDeleteProject = async (projectId: number) => {
    if (!window.confirm('Delete this project?')) return;
    try {
      await apiService.deleteProject(projectId, user?.id || 1);
      setProjects(projects.filter(p => p.id !== projectId));
    } catch (err) {
      console.error('Error deleting project:', err);
      setError('Failed to delete project');
    }
  };

  const handleDragStart = (e: React.DragEvent, projectId: number) => {
    setDraggedProjectId(projectId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDropOnFolder = async (e: React.DragEvent, folderId: number) => {
    e.preventDefault();
    if (draggedProjectId) {
      try {
        // Call API to update project's folder
        await apiService.updateProject(draggedProjectId, undefined, undefined, folderId, user?.id || 1);
        // Update locally for UI feedback
        const updatedProjects = projects.map(p =>
          p.id === draggedProjectId ? { ...p, folderId } : p
        );
        setProjects(updatedProjects);
      } catch (err) {
        console.error('Error moving project:', err);
        setError('Failed to move project');
      }
      setDraggedProjectId(null);
    }
  };

  const handleDropOnRoot = async (e: React.DragEvent) => {
    e.preventDefault();
    if (draggedProjectId) {
      try {
        // Call API to update project's folder to null
        await apiService.updateProject(draggedProjectId, undefined, undefined, null, user?.id || 1);
        const updatedProjects = projects.map(p =>
          p.id === draggedProjectId ? { ...p, folderId: null } : p
        );
        setProjects(updatedProjects);
      } catch (err) {
        console.error('Error moving project:', err);
        setError('Failed to move project');
      }
      setDraggedProjectId(null);
    }
  };

  const toggleFolder = (folderId: number) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(folderId)) {
      newExpanded.delete(folderId);
    } else {
      newExpanded.add(folderId);
    }
    setExpandedFolders(newExpanded);
  };

  const rootProjects = projects.filter(p => !p.folderId);

  const getFolderProjects = (folderId: number) => {
    return projects.filter(p => p.folderId === folderId);
  };

  const renderFolderContent = (folder: Folder, level: number = 0) => {
    const isExpanded = expandedFolders.has(folder.id);
    const folderProjects = getFolderProjects(folder.id);

    return (
      <div key={folder.id} style={{ marginLeft: `${level * 20}px` }}>
        <div className="folder-item">
          <span
            className="folder-toggle"
            onClick={() => toggleFolder(folder.id)}
          >
            {isExpanded ? '▼' : '▶'}
          </span>
          
          {renamingFolderId === folder.id ? (
            <input
              type="text"
              className="folder-rename-input"
              value={renamingName}
              autoFocus
              onChange={(e) => setRenamingName(e.target.value)}
              onBlur={() => handleRenameFolder(folder.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleRenameFolder(folder.id);
                if (e.key === 'Escape') setRenamingFolderId(null);
              }}
            />
          ) : (
            <>
              <span className="folder-icon">📁 {folder.name}</span>
              <div className="folder-actions">
                <button
                  className="action-btn-sm"
                  onClick={() => {
                    setRenamingFolderId(folder.id);
                    setRenamingName(folder.name);
                  }}
                >
                  ✏️
                </button>
                <button
                  className="action-btn-sm"
                  onClick={() => handleDeleteFolder(folder.id)}
                >
                  🗑️
                </button>
              </div>
            </>
          )}
        </div>

        {isExpanded && (
          <div className="folder-contents" onDragOver={handleDragOver} onDrop={(e) => handleDropOnFolder(e, folder.id)}>
            {folder.subFolders.map(subFolder => renderFolderContent(subFolder, level + 1))}

            {folderProjects.map(project => (
              <div
                key={project.id}
                className={`project-item ${draggedProjectId === project.id ? 'dragging' : ''}`}
                draggable
                onDragStart={(e) => handleDragStart(e, project.id)}
                onDragEnd={() => setDraggedProjectId(null)}
              >
                <span className="project-type-icon">
                  {project.type === 1 ? '🤖' : '📊'}
                </span>
                <span className="project-title">{project.name}</span>
                <div className="project-actions-inline">
                  <button
                    className="action-btn-sm"
                    onClick={() => navigate(`/project/${project.id}`)}
                  >
                    Open
                  </button>
                  <button
                    className="action-btn-sm danger"
                    onClick={() => handleDeleteProject(project.id)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="dashboard-container">
      {/* Header */}
      <div className="dashboard-header">
        <div>
          <h1>📁 Projects</h1>
          <p>Welcome, {user?.fullName || user?.username}!</p>
        </div>
        <div className="header-buttons">
          <button
            className="btn-primary"
            onClick={() => setShowTypeModal(true)}
          >
            ➕ New Project
          </button>
          {showNewFolderInput ? (
            <div className="header-folder-input">
              <input
                type="text"
                placeholder="Folder name..."
                value={newFolderName}
                autoFocus
                onChange={(e) => setNewFolderName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreateFolder();
                  if (e.key === 'Escape') {
                    setShowNewFolderInput(false);
                    setNewFolderName('');
                  }
                }}
              />
              <button className="btn-confirm" onClick={handleCreateFolder}>✓</button>
              <button
                className="btn-cancel"
                onClick={() => {
                  setShowNewFolderInput(false);
                  setNewFolderName('');
                }}
              >
                ✕
              </button>
            </div>
          ) : (
            <button
              className="btn-secondary"
              onClick={() => setShowNewFolderInput(true)}
            >
              ➕ New Folder
            </button>
          )}
        </div>
      </div>

      {/* Error message */}
      {error && (
        <motion.div
          className="error-message"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          ⚠️ {error}
          <button onClick={() => setError('')}>×</button>
        </motion.div>
      )}

      {/* Main content */}
      {loading ? (
        <div className="loading">
          <span className="spinner"></span> Loading...
        </div>
      ) : (
        <div className="projects-view">
          {/* Folders and Root Projects */}
          <div className="folders-section">
            {/* Folders tree */}
            <div className="folders-tree">
              {folders
                .filter(f => !f.parentFolderId)
                .map(folder => renderFolderContent(folder, 0))}
            </div>

            {/* Root Projects (Not in any folder) */}
            {rootProjects.length > 0 && (
              <div
                className="root-projects-zone"
                onDragOver={handleDragOver}
                onDrop={handleDropOnRoot}
              >
                <div className="zone-label">📋 Projects (Root)</div>
                <div className="projects-list">
                  {rootProjects.map(project => (
                    <div
                      key={project.id}
                      className={`project-item ${draggedProjectId === project.id ? 'dragging' : ''}`}
                      draggable
                      onDragStart={(e) => handleDragStart(e, project.id)}
                      onDragEnd={() => setDraggedProjectId(null)}
                    >
                      <span className="project-type-icon">
                        {project.type === 1 ? '🤖' : '📊'}
                      </span>
                      <span className="project-title">{project.name}</span>
                      <div className="project-actions-inline">
                        <button
                          className="action-btn-sm"
                          onClick={() => navigate(`/project/${project.id}`)}
                        >
                          Open
                        </button>
                        <button
                          className="action-btn-sm danger"
                          onClick={() => handleDeleteProject(project.id)}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Empty state */}
            {folders.length === 0 && rootProjects.length === 0 && (
              <div className="empty-state">
                <div className="empty-icon">📭</div>
                <h2>No projects yet</h2>
                <p>Create your first project to get started</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Project Type Modal */}
      <ProjectTypeModal
        isOpen={showTypeModal}
        onClose={() => {
          setShowTypeModal(false);
          setProjectName('');
          setProjectDescription('');
        }}
        onSelectType={handleCreateProject}
        projectName={projectName}
        projectDescription={projectDescription}
        onNameChange={setProjectName}
        onDescriptionChange={setProjectDescription}
      />
    </div>
  );
};

export default Dashboard;
