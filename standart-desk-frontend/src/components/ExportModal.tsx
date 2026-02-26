import React, { useState } from 'react';
import { apiService } from '../services/api';
import '../styles/export-modal.css';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const STATUS_OPTIONS = [
  { value: null, label: 'All Tasks' },
  { value: 0, label: '📋 To Do' },
  { value: 1, label: '⏳ In Progress' },
  { value: 2, label: '👀 In Review' },
  { value: 3, label: '✅ Done' },
];

export const ExportModal: React.FC<ExportModalProps> = ({ isOpen, onClose }) => {
  const [selectedStatus, setSelectedStatus] = useState<number | null>(null);
  const [format, setFormat] = useState<'csv' | 'json'>('csv');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleExport = async () => {
    try {
      setLoading(true);
      setError(null);

      const blob = format === 'csv'
        ? (await apiService.exportTasksToCsv(selectedStatus ?? undefined)).data
        : (await apiService.exportTasksToJson(selectedStatus ?? undefined)).data;

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = format === 'csv' 
        ? `tasks-export-${selectedStatus ?? 'all'}-${new Date().toISOString().slice(0, 10)}.csv`
        : `tasks-export-${selectedStatus ?? 'all'}-${new Date().toISOString().slice(0, 10)}.json`;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      onClose();
    } catch (err) {
      console.error('Export failed:', err);
      setError('Failed to export tasks. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="export-modal__overlay" onClick={onClose}>
      <div className="export-modal" onClick={(e) => e.stopPropagation()}>
        <div className="export-modal__header">
          <h2 className="export-modal__title">📥 Export Tasks</h2>
          <button className="export-modal__close" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="export-modal__body">
          {error && <div className="export-modal__error">{error}</div>}

          {/* Status Filter */}
          <div className="export-modal__section">
            <h3 className="export-modal__label">Filter by Status</h3>
            <div className="export-modal__status-grid">
              {STATUS_OPTIONS.map((option) => (
                <button
                  key={option.value ?? 'all'}
                  className={`export-modal__status-btn ${selectedStatus === option.value ? 'active' : ''}`}
                  onClick={() => setSelectedStatus(option.value)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* Format Selection */}
          <div className="export-modal__section">
            <h3 className="export-modal__label">Export Format</h3>
            <div className="export-modal__format-options">
              <label className="export-modal__radio">
                <input
                  type="radio"
                  value="csv"
                  checked={format === 'csv'}
                  onChange={(e) => setFormat(e.target.value as 'csv' | 'json')}
                />
                <span className="export-modal__radio-text">CSV (Excel)</span>
              </label>
              <label className="export-modal__radio">
                <input
                  type="radio"
                  value="json"
                  checked={format === 'json'}
                  onChange={(e) => setFormat(e.target.value as 'csv' | 'json')}
                />
                <span className="export-modal__radio-text">JSON</span>
              </label>
            </div>
          </div>

          {/* Summary */}
          <div className="export-modal__summary">
            <p>
              Exporting <strong>{STATUS_OPTIONS.find(o => o.value === selectedStatus)?.label || 'All Tasks'}</strong> as <strong>{format.toUpperCase()}</strong>
            </p>
          </div>
        </div>

        <div className="export-modal__footer">
          <button
            className="export-modal__btn export-modal__btn--secondary"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </button>
          <button
            className="export-modal__btn export-modal__btn--primary"
            onClick={handleExport}
            disabled={loading}
          >
            {loading ? '⏳ Exporting...' : '📥 Download'}
          </button>
        </div>
      </div>
    </div>
  );
};
