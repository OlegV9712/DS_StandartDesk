import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { CanvasEditor } from '../components/CanvasEditor';
import { useAuth } from '../store/authStore';
import { apiService } from '../services/api';
import '../styles/editor.css';

interface BlockSchema {
  id: number;
  name: string;
  content: string;
  pageId: number;
  projectId: number;
  version: number;
  createdAt: string;
  updatedAt?: string;
}

export const ProjectEditor: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const user = useAuth((state) => state.user);
  
  const [activeTab, setActiveTab] = useState<'editor' | 'pages'>('editor');
  const [blockSchema, setBlockSchema] = useState<BlockSchema | null>(null);
  const [pages, setPages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (id && user?.id) {
      loadProjectData();
    }
  }, [id, user?.id]);

  const loadProjectData = async () => {
    try {
      setLoading(true);
      console.log(`[EDITOR] Loading project ${id} for user ${user?.id}`);

      // Fetch pages for this project
      try {
        const pagesResponse = await apiService.getPages(parseInt(id!));
        const pagesData = pagesResponse.data;
        console.log('[EDITOR] Loaded pages:', pagesData);
        setPages(pagesData);

        // Load first page's block schema or create new one
        if (pagesData && pagesData.length > 0) {
          const firstPageId = pagesData[0].id;
          const schemasResponse = await apiService.getBlockSchemas(firstPageId);
          const schemasData = schemasResponse.data;
          console.log('[EDITOR] Loaded schemas:', schemasData);
          if (schemasData && schemasData.length > 0) {
            setBlockSchema(schemasData[0] as any);
          } else {
            // Create new schema if none exists
            await createNewSchema(firstPageId);
          }
        } else {
          // Create default page
          await createDefaultPage();
        }
      } catch (pageErr: any) {
        console.error('[EDITOR] Failed to fetch pages:', pageErr);
        if (pageErr.response?.status === 401) {
          setError('Not authenticated - please login again');
        } else {
          setError('Failed to load pages: ' + (pageErr.response?.data?.message || pageErr.message));
        }
      }
    } catch (err) {
      console.error('[EDITOR] Error loading project data:', err);
      setError('Failed to load project. Error: ' + (err instanceof Error ? err.message : 'Unknown'));
    } finally {
      setLoading(false);
    }
  };

  const createDefaultPage = async () => {
    try {
      console.log('[EDITOR] Creating default page');
      const pageResponse = await apiService.createPage(parseInt(id!), 'Default Page', 0, user?.id);
      const page = pageResponse.data;
      console.log('[EDITOR] Default page created:', page);
      setPages([page]);
      await createNewSchema(page.id);
    } catch (err: any) {
      console.error('[EDITOR] Error creating default page:', err);
      const errorMsg = err.response?.data?.message || err.message || 'Unknown error';
      setError('Failed to create default page: ' + errorMsg);
    }
  };

  const createNewSchema = async (pageId: number) => {
    try {
      console.log('[EDITOR] Creating new block schema for page', pageId);
      const schemaResponse = await apiService.createBlockSchema(
        parseInt(id!),
        pageId,
        'Diagram 1',
        JSON.stringify({ blocks: [], connections: [] }),
        user?.id
      );
      const schema = schemaResponse.data;
      console.log('[EDITOR] New schema created:', schema);
      setBlockSchema(schema as any);
    } catch (err: any) {
      console.error('[EDITOR] Error creating new schema:', err);
      const errorMsg = err.response?.data?.message || err.message || 'Unknown error';
      setError('Failed to create block schema: ' + errorMsg);
    }
  };

  const handleSaveBlockSchema = async (content: string): Promise<void> => {
    if (!blockSchema) {
      throw new Error('No block schema loaded');
    }

    try {
      setSaving(true);
      console.log('[EDITOR] Saving block schema', blockSchema.id, 'with content length:', content.length);

      const response = await apiService.updateBlockSchema(
        blockSchema.id,
        blockSchema.name,
        content,
        'Updated diagram from canvas editor',
        user?.id
      );

      console.log('[EDITOR] Block schema saved successfully:', response.status);
      
      // Update local state
      setBlockSchema({
        ...blockSchema,
        updatedAt: new Date().toISOString()
      });
    } catch (err) {
      console.error('[EDITOR] Save error:', err);
      throw err;
    } finally {
      setSaving(false);
    }
  };

  if (!id || !user?.id) {
    return (
      <div className="editor-error">
        <h2>❌ Project not found or not authenticated</h2>
        <button onClick={() => navigate('/dashboard')}>← Back to Dashboard</button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="editor-loading">
        <div className="spinner"></div>
        <p>Loading project...</p>
      </div>
    );
  }

  return (
    <div className="project-editor">
      {/* Header */}
      <div className="editor-header">
        <div className="header-left">
          <button className="back-btn" onClick={() => navigate('/dashboard')}>
            ← Back
          </button>
          <h1 className="project-title">Project #{id}</h1>
          {blockSchema && <span className="schema-info">| {blockSchema.name}</span>}
        </div>
        <div className="header-right">
          <button
            className={`tab-btn ${activeTab === 'editor' ? 'active' : ''}`}
            onClick={() => setActiveTab('editor')}
          >
            📐 Canvas Editor
          </button>
          <button
            className={`tab-btn ${activeTab === 'pages' ? 'active' : ''}`}
            onClick={() => setActiveTab('pages')}
          >
            📑 Pages ({pages.length})
          </button>
          {saving && <span className="saving-indicator">💾 Сохраняется...</span>}
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="editor-error-message">
          ⚠️ {error}
          <button onClick={() => setError('')} className="error-close">✕</button>
        </div>
      )}

      {/* Content */}
      <div className="editor-content">
        {activeTab === 'editor' && blockSchema ? (
          <div className="editor-section">
            <CanvasEditor
              projectId={parseInt(id)}
              blockSchema={blockSchema}
              onSave={handleSaveBlockSchema}
            />
          </div>
        ) : activeTab === 'editor' ? (
          <div className="editor-loading">
            <p>Loading block schema...</p>
          </div>
        ) : (
          <div className="pages-section">
            <div className="pages-placeholder">
              <p>📑 Pages management coming soon</p>
              <p>Current pages: {pages.length}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
