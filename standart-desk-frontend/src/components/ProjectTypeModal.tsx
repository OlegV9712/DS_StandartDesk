import React, { useState } from 'react';
import { motion } from 'framer-motion';
import '../styles/components.css';

interface ProjectTypeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectType: (type: 'algorithm' | 'assistant_bot', name: string, description: string) => void;
  projectName: string;
  projectDescription: string;
  onNameChange: (name: string) => void;
  onDescriptionChange: (description: string) => void;
}

export const ProjectTypeModal: React.FC<ProjectTypeModalProps> = ({
  isOpen,
  onClose,
  onSelectType,
  projectName,
  projectDescription,
  onNameChange,
  onDescriptionChange
}) => {
  const [step, setStep] = useState<'details' | 'type'>('details');
  const [selectedType, setSelectedType] = useState<'algorithm' | 'assistant_bot' | null>(null);

  const handleNext = () => {
    if (!projectName.trim()) {
      alert('Project name is required');
      return;
    }
    if (selectedType) {
      onSelectType(selectedType, projectName, projectDescription);
      setStep('details');
      setSelectedType(null);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <motion.div
        className="modal modal-large"
        onClick={(e) => e.stopPropagation()}
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
      >
        {step === 'details' ? (
          <>
            <h2 className="modal-title">📝 Create New Project</h2>
            <div className="form-group">
              <label htmlFor="name">Project Name *</label>
              <input
                id="name"
                type="text"
                placeholder="Enter project name"
                value={projectName}
                onChange={(e) => onNameChange(e.target.value)}
                className="form-input"
                autoFocus
              />
            </div>

            <div className="form-group">
              <label htmlFor="description">Description</label>
              <textarea
                id="description"
                placeholder="Enter project description (optional)"
                value={projectDescription}
                onChange={(e) => onDescriptionChange(e.target.value)}
                className="form-input form-textarea"
                rows={3}
              />
            </div>

            <div className="modal-actions">
              <button
                type="button"
                className="btn-primary"
                onClick={() => setStep('type')}
              >
                Next: Select Type
              </button>
              <button type="button" className="btn-secondary" onClick={onClose}>
                Cancel
              </button>
            </div>
          </>
        ) : (
          <>
            <h2 className="modal-title">🎯 Select Project Type</h2>
            <p className="modal-subtitle">Choose how you want to use this project</p>

            <div className="type-options">
              <motion.button
                className={`type-option ${selectedType === 'algorithm' ? 'selected' : ''}`}
                onClick={() => setSelectedType('algorithm')}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <div className="type-icon">📊</div>
                <h3>Algorithm</h3>
                <p>Standard flowchart for processes and algorithms</p>
              </motion.button>

              <motion.button
                className={`type-option ${selectedType === 'assistant_bot' ? 'selected' : ''}`}
                onClick={() => setSelectedType('assistant_bot')}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <div className="type-icon">🤖</div>
                <h3>Assistant Bot</h3>
                <p>Interactive chatbot with branching conversations</p>
              </motion.button>
            </div>

            <div className="modal-actions">
              <button
                type="button"
                className="btn-primary"
                onClick={handleNext}
                disabled={!selectedType}
              >
                Create Project
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setStep('details')}
              >
                Back
              </button>
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
};

export default ProjectTypeModal;
