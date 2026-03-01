import React, { useState } from 'react';
import { Folder, Project } from '../types';
import '../styles/folder-tree.css';

interface FolderTreeProps {
  folders: Folder[];
  projects: Project[];
  onSelectFolder: (folderId: number | null) => void;
  onSelectProject: (projectId: number) => void;
  onCreateFolder: (parentFolderId: number | null, name: string) => Promise<void>;
  onRenameFolder: (folderId: number, newName: string) => Promise<void>;
  onDeleteFolder: (folderId: number) => Promise<void>;
  selectedProjectId?: number;
  selectedFolderId?: number | null;
}

export const FolderTree: React.FC<FolderTreeProps> = ({
  folders,
  projects,
  onSelectFolder,
  onSelectProject,
  onCreateFolder,
  onRenameFolder,
  onDeleteFolder,
  selectedProjectId,
  selectedFolderId,
}) => {
  const [expandedFolders, setExpandedFolders] = useState<Set<number>>(new Set());
  const [renamingFolderId, setRenamingFolderId] = useState<number | null>(null);
  const [renamingFolderName, setRenamingFolderName] = useState('');
  const [creatingInFolder, setCreatingInFolder] = useState<number | null>(null);
  const [newFolderName, setNewFolderName] = useState('');

  const toggleFolder = (folderId: number) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(folderId)) {
      newExpanded.delete(folderId);
    } else {
      newExpanded.add(folderId);
    }
    setExpandedFolders(newExpanded);
  };

  const handleStartRename = (folderId: number, currentName: string) => {
    setRenamingFolderId(folderId);
    setRenamingFolderName(currentName);
  };

  const handleRenameSubmit = async (folderId: number) => {
    if (renamingFolderName.trim()) {
      try {
        await onRenameFolder(folderId, renamingFolderName);
      } catch (err) {
        console.error('Failed to rename folder:', err);
      }
    }
    setRenamingFolderId(null);
  };

  const handleCreateFolderSubmit = async (parentFolderId: number | null) => {
    if (newFolderName.trim()) {
      try {
        await onCreateFolder(parentFolderId, newFolderName);
        setNewFolderName('');
        setCreatingInFolder(null);
      } catch (err) {
        console.error('Failed to create folder:', err);
      }
    }
  };

  const handleDeleteFolder = async (folderId: number) => {
    if (window.confirm('Удалить папку и все содержимое?')) {
      try {
        await onDeleteFolder(folderId);
      } catch (err) {
        console.error('Failed to delete folder:', err);
      }
    }
  };

  // Get all projects not in any folder (root level)
  const rootProjects = projects.filter(p => !p.folderId);

  const renderFolderNode = (folder: Folder, level: number = 0) => {
    const isExpanded = expandedFolders.has(folder.id);
    const folderProjects = projects.filter(p => p.folderId === folder.id);
    const hasSubContent = folder.subFolders.length > 0 || folderProjects.length > 0;

    return (
      <div key={folder.id} className="folder-node" style={{ marginLeft: `${level * 15}px` }}>
        <div
          className={`folder-header ${selectedFolderId === folder.id ? 'selected' : ''}`}
          onClick={() => onSelectFolder(folder.id)}
        >
          <span
            className={`folder-toggle ${hasSubContent ? '' : 'empty'}`}
            onClick={(e) => {
              e.stopPropagation();
              if (hasSubContent) toggleFolder(folder.id);
            }}
          >
            {hasSubContent && (isExpanded ? '▼' : '▶')}
          </span>
          
          {renamingFolderId === folder.id ? (
            <input
              type="text"
              className="folder-name-input"
              value={renamingFolderName}
              onChange={(e) => setRenamingFolderName(e.target.value)}
              onBlur={() => handleRenameSubmit(folder.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleRenameSubmit(folder.id);
                if (e.key === 'Escape') setRenamingFolderId(null);
              }}
              autoFocus
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <span className="folder-name">📁 {folder.name}</span>
          )}

          <div className="folder-actions">
            <button
              className="action-btn"
              title="Создать подпапку"
              onClick={(e) => {
                e.stopPropagation();
                setCreatingInFolder(folder.id);
              }}
            >
              ➕
            </button>
            <button
              className="action-btn"
              title="Переименовать"
              onClick={(e) => {
                e.stopPropagation();
                handleStartRename(folder.id, folder.name);
              }}
            >
              ✏️
            </button>
            <button
              className="action-btn"
              title="Удалить папку"
              onClick={(e) => {
                e.stopPropagation();
                handleDeleteFolder(folder.id);
              }}
            >
              🗑️
            </button>
          </div>
        </div>

        {creatingInFolder === folder.id && (
          <div className="create-folder-input" style={{ marginLeft: `${(level + 1) * 15}px` }}>
            <input
              type="text"
              placeholder="Название новой папки"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreateFolderSubmit(folder.id);
                if (e.key === 'Escape') {
                  setCreatingInFolder(null);
                  setNewFolderName('');
                }
              }}
              autoFocus
            />
            <button onClick={() => handleCreateFolderSubmit(folder.id)}>Создать</button>
            <button onClick={() => {
              setCreatingInFolder(null);
              setNewFolderName('');
            }}>Отмена</button>
          </div>
        )}

        {isExpanded && (
          <>
            {folder.subFolders.map(subFolder => renderFolderNode(subFolder, level + 1))}

            {folderProjects.map(project => (
              <div
                key={project.id}
                className={`project-item ${selectedProjectId === project.id ? 'selected' : ''}`}
                style={{ marginLeft: `${(level + 1) * 15}px` }}
                onClick={() => onSelectProject(project.id)}
              >
                <span className="project-icon">
                  {project.type === 1 ? '🤖' : '📊'}
                </span>
                <span className="project-name">{project.name}</span>
              </div>
            ))}
          </>
        )}
      </div>
    );
  };

  return (
    <div className="folder-tree">
      <div className="root-section">
        <div className="root-header">
          <span className="root-title">📦 Мои проекты</span>
          <button
            className="action-btn"
            title="Создать новую папку"
            onClick={() => setCreatingInFolder(null)}
          >
            ➕ Папка
          </button>
        </div>

        {creatingInFolder === null && (
          <div className="create-folder-input" style={{ marginLeft: '0px' }}>
            <input
              type="text"
              placeholder="Название новой папки"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreateFolderSubmit(null);
                if (e.key === 'Escape') {
                  setCreatingInFolder(null);
                  setNewFolderName('');
                }
              }}
              autoFocus
            />
            <button onClick={() => handleCreateFolderSubmit(null)}>Создать</button>
            <button onClick={() => {
              setCreatingInFolder(null);
              setNewFolderName('');
            }}>Отмена</button>
          </div>
        )}

        {/* Root level folders */}
        {folders
          .filter(f => !f.parentFolderId)
          .map(folder => renderFolderNode(folder, 0))}

        {/* Root level projects */}
        <div className="projects-section">
          {rootProjects.length > 0 ? (
            <>
              <div className="projects-title">📋 Проекты без папки</div>
              {rootProjects.map(project => (
                <div
                  key={project.id}
                  className={`project-item root-project ${selectedProjectId === project.id ? 'selected' : ''}`}
                  onClick={() => onSelectProject(project.id)}
                >
                  <span className="project-icon">
                    {project.type === 1 ? '🤖' : '📊'}
                  </span>
                  <span className="project-name">{project.name}</span>
                </div>
              ))}
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
};
