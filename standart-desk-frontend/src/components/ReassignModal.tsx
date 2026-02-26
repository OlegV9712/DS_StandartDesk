import React, { useState, useEffect } from 'react';
import { User } from '../types';
import '../styles/reassign-modal.css';

interface ReassignModalProps {
  isOpen: boolean;
  taskId: number;
  taskTitle: string;
  currentAssignee?: string;
  users: User[];
  onReassign: (userId: number | null) => void;
  onClose: () => void;
}

export const ReassignModal: React.FC<ReassignModalProps> = ({
  isOpen,
  taskTitle,
  currentAssignee,
  users,
  onReassign,
  onClose,
}) => {
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredUsers, setFilteredUsers] = useState<User[]>(users);

  useEffect(() => {
    if (!isOpen) return;

    const filtered = users.filter(
      user =>
        user.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredUsers(filtered);
  }, [searchTerm, users, isOpen]);

  const handleReassign = () => {
    onReassign(selectedUserId);
    setSelectedUserId(null);
    setSearchTerm('');
    onClose();
  };

  const handleUnassign = () => {
    onReassign(null);
    setSelectedUserId(null);
    setSearchTerm('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="reassign-modal__overlay" onClick={onClose}>
      <div className="reassign-modal" onClick={(e) => e.stopPropagation()}>
        <div className="reassign-modal__header">
          <h2 className="reassign-modal__title">Reassign Task</h2>
          <button className="reassign-modal__close" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="reassign-modal__content">
          <p className="reassign-modal__task-title">{taskTitle}</p>

          {currentAssignee && (
            <p className="reassign-modal__current">
              Currently assigned to: <strong>{currentAssignee}</strong>
            </p>
          )}

          <div className="reassign-modal__search-wrapper">
            <input
              type="text"
              className="reassign-modal__search"
              placeholder="Search team members..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              autoFocus
            />
          </div>

          <div className="reassign-modal__users-list">
            {filteredUsers.length === 0 ? (
              <div className="reassign-modal__empty">No team members found</div>
            ) : (
              filteredUsers.map((user) => (
                <label key={user.id} className="reassign-modal__user-item">
                  <input
                    type="radio"
                    name="assignee"
                    value={user.id}
                    checked={selectedUserId === user.id}
                    onChange={(e) => setSelectedUserId(parseInt(e.target.value))}
                    className="reassign-modal__radio"
                  />
                  <div className="reassign-modal__user-info">
                    <span className="reassign-modal__user-name">
                      {user.fullName || user.username}
                    </span>
                    <span className="reassign-modal__user-email">{user.email}</span>
                  </div>
                </label>
              ))
            )}
          </div>
        </div>

        <div className="reassign-modal__footer">
          <button className="reassign-modal__btn reassign-modal__btn--secondary" onClick={onClose}>
            Cancel
          </button>

          <button
            className="reassign-modal__btn reassign-modal__btn--danger"
            onClick={handleUnassign}
          >
            Unassign
          </button>

          <button
            className="reassign-modal__btn reassign-modal__btn--primary"
            onClick={handleReassign}
            disabled={selectedUserId === null}
          >
            Reassign
          </button>
        </div>
      </div>
    </div>
  );
};
