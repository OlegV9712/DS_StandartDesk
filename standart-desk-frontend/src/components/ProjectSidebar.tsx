import React from 'react';
import { Page } from '../types';
import '../styles/components.css';

// Добавить ФИО ответственного (из списка пользователей)
// Добавить папки

interface ProjectSidebarProps {
  pages: Page[];
  currentPageId?: number;
  onPageSelect: (page: Page) => void;
  onAddPage?: () => void;
  onDeletePage?: (pageId: number) => void;
}

export const ProjectSidebar: React.FC<ProjectSidebarProps> = ({
  pages,
  currentPageId,
  onPageSelect,
  onAddPage,
  onDeletePage
}) => {
  return (
    <aside style={{
      width: '280px',
      height: '100vh',
      backgroundColor: 'var(--color-light)',
      borderRight: '1px solid var(--color-border)',
      display: 'flex',
      flexDirection: 'column',
      overflowY: 'auto',
      position: 'fixed',
      left: 0,
      top: 0
    }}>
      <div style={{ padding: 'var(--spacing-lg)' }}>
        <h2 className="card-title" style={{ fontSize: 'var(--font-size-lg)' }}>
          Страницы проекта
        </h2>
        <button
          onClick={onAddPage}
          className="btn btn-sm btn-accent"
          style={{ width: '100%', marginTop: 'var(--spacing-md)' }}
        >
          + Добавить страницу
        </button>
      </div>

      <nav style={{ flex: 1, overflowY: 'auto' }}>
        {pages.length === 0 ? (
          <div style={{ padding: 'var(--spacing-lg)' }}>
            <p className="text-muted text-small">Нет страниц в проекте</p>
          </div>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {pages.map((page) => (
              <li
                key={page.id}
                style={{
                  borderBottom: '1px solid var(--color-border)',
                  backgroundColor: currentPageId === page.id ? 'var(--color-accent-pink-light)' : 'transparent'
                }}
              >
                <div style={{
                  padding: 'var(--spacing-md)',
                  cursor: 'pointer',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  transition: 'all var(--transition-base)'
                }}
                  onClick={() => onPageSelect(page)}
                >
                  <div>
                    <p style={{ marginBottom: 0, fontWeight: 500 }}>{page.name}</p>
                    <p className="text-small text-muted" style={{ marginBottom: 0 }}>
                      Порядок: {page.order}
                    </p>
                  </div>
                  {onDeletePage && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeletePage(page.id);
                      }}
                      className="btn btn-icon-sm btn-secondary"
                      style={{ opacity: 0.7 }}
                    >
                      🗑️
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </nav>
    </aside>
  );
};

export default ProjectSidebar;
