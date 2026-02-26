import React, { useState, useEffect } from 'react';
import { BlockSchemaVersion } from '../types';
import { apiService } from '../services/api';
import '../styles/components.css';

interface VersionHistoryProps {
  blockSchemaId: number;
  onRevert?: (versionId: number) => void;
}

export const VersionHistory: React.FC<VersionHistoryProps> = ({
  blockSchemaId,
  onRevert
}) => {
  const [versions, setVersions] = useState<BlockSchemaVersion[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState<BlockSchemaVersion | null>(null);
  const [revertReason, setRevertReason] = useState('');

  useEffect(() => {
    loadHistory();
  }, [blockSchemaId]);

  const loadHistory = async () => {
    setLoading(true);
    try {
      const versionRes = await apiService.getVersionHistory(blockSchemaId);
      setVersions(versionRes.data);
    } catch (err) {
      console.error('Failed to load history:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRevert = async (versionNumber: number) => {
    if (!onRevert) return;
    try {
      await apiService.revertToVersion(blockSchemaId, versionNumber, revertReason);
      onRevert(versionNumber);
      setRevertReason('');
      setSelectedVersion(null);
      await loadHistory();
    } catch (err) {
      console.error('Failed to revert:', err);
    }
  };

  return (
    <div className="card">
      <div className="card-header">
        <h3 className="card-title">История изменений</h3>
        <button onClick={loadHistory} className="btn btn-sm btn-secondary">
          🔄 Обновить
        </button>
      </div>

      <div className="card-body">
        {loading && <p>Загрузка...</p>}

        {versions.length === 0 ? (
          <p className="text-muted text-center">Нет истории версий</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
            {versions.map((version, index) => (
              <div
                key={version.id}
                style={{
                  padding: 'var(--spacing-md)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-md)',
                  cursor: 'pointer',
                  transition: 'all var(--transition-base)',
                  backgroundColor: selectedVersion?.id === version.id ? 'var(--color-accent-pink-light)' : 'transparent'
                }}
                onClick={() => setSelectedVersion(version)}
              >
                <div className="flex-between">
                  <div>
                    <strong>Версия {version.versionNumber}</strong>
                    <p className="text-small text-muted" style={{ marginBottom: 0 }}>
                      {new Date(version.createdAt).toLocaleString('ru-RU')}
                    </p>
                    <p className="text-small text-muted" style={{ marginBottom: 0 }}>
                      Пользователь: {version.createdByUserName}
                    </p>
                    {version.changeDescription && (
                      <p className="text-small" style={{ marginBottom: 0, marginTop: 'var(--spacing-sm)' }}>
                        {version.changeDescription}
                      </p>
                    )}
                  </div>
                  {index > 0 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRevert(version.versionNumber);
                      }}
                      className="btn btn-sm btn-accent"
                    >
                      ↶ Вернуть
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {selectedVersion && selectedVersion.versionNumber > 1 && (
          <div style={{ marginTop: 'var(--spacing-lg)', paddingTop: 'var(--spacing-lg)', borderTop: '1px solid var(--color-border)' }}>
            <div className="form-group">
              <label className="form-label">Причина отката (опционально):</label>
              <textarea
                className="form-textarea"
                value={revertReason}
                onChange={(e) => setRevertReason(e.target.value)}
                placeholder="Укажите причину отката..."
                rows={3}
              />
            </div>
            <div className="flex gap-md">
              <button
                onClick={() => handleRevert(selectedVersion.versionNumber)}
                className="btn btn-primary"
              >
                Откатить к версии {selectedVersion.versionNumber}
              </button>
              <button
                onClick={() => setSelectedVersion(null)}
                className="btn btn-secondary"
              >
                Отмена
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VersionHistory;
