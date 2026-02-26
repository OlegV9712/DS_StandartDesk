import React, { useState, useEffect } from 'react';
import { Task, User } from '../types';
import { CommentSection } from './CommentSection';
import '../styles/task-detail-modal.css';

interface TaskDetailModalProps {
  isOpen: boolean;
  task: Task | null;
  users: User[];
  onUpdateTask: (taskId: number, updates: {
    status?: number;
    priority?: number;
    assignedToUserId?: number | null;
    dueDate?: string;
  }) => void;
  onDelete?: (taskId: number) => void;
  onClose: () => void;
}

const STATUS_LABELS: Record<number, string> = {
  0: 'To Do',
  1: 'In Progress',
  2: 'In Review',
  3: 'Done',
};

const STATUS_COLORS: Record<number, string> = {
  0: '#6b7280',
  1: '#f59e0b',
  2: '#3b82f6',
  3: '#10b981',
};

const PRIORITY_LABELS: Record<number, string> = {
  0: 'Low',
  1: 'Medium',
  2: 'High',
  3: 'Urgent',
};

const PRIORITY_COLORS: Record<number, string> = {
  0: '#10b981',
  1: '#3b82f6',
  2: '#f59e0b',
  3: '#dc2626',
};

export const TaskDetailModal: React.FC<TaskDetailModalProps> = ({
  isOpen,
  task,
  users,
  onUpdateTask,
  onDelete,
  onClose,
}) => {
  const [status, setStatus] = useState<number>(0);
  const [priority, setPriority] = useState<number>(1);
  const [assignedToUserId, setAssignedToUserId] = useState<number | null>(null);
  const [dueDate, setDueDate] = useState<string>('');

  useEffect(() => {
    if (task) {
      setStatus(task.status);
      setPriority(task.priority || 1);
      setAssignedToUserId(task.assignedToUserId || null);
      setDueDate(task.dueDate ? task.dueDate.split('T')[0] : '');
    }
  }, [task]);

  if (!isOpen || !task) return null;

  const handleStatusChange = (newStatus: number) => {
    setStatus(newStatus);
    onUpdateTask(task.id, { status: newStatus });
  };

  const handlePriorityChange = (newPriority: number) => {
    setPriority(newPriority);
    onUpdateTask(task.id, { priority: newPriority });
  };

  const handleAssigneeChange = (newAssigneeId: number | null) => {
    setAssignedToUserId(newAssigneeId);
    onUpdateTask(task.id, { assignedToUserId: newAssigneeId });
  };

  const handleDueDateChange = (newDueDate: string) => {
    setDueDate(newDueDate);
    onUpdateTask(task.id, { dueDate: newDueDate });
  };

  const isOverdue = dueDate && new Date(dueDate).getTime() < new Date().getTime();
  const isDueToday = dueDate && new Date(dueDate).toDateString() === new Date().toDateString();

  const assignee = task.assignedToUserId
    ? users.find((u) => u.id === task.assignedToUserId)
    : null;

  return (
    <div className="task-detail-modal__overlay" onClick={onClose}>
      <div className="task-detail-modal" onClick={(e) => e.stopPropagation()}>
        <div className="task-detail-modal__header">
          <div>
            <h2 className="task-detail-modal__title">{task.title}</h2>
            <p className="task-detail-modal__id">Task #{task.id}</p>
          </div>
          <button className="task-detail-modal__close" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="task-detail-modal__content">
          {/* Status Section */}
          <section className="task-detail-modal__section">
            <h3 className="task-detail-modal__section-title">Status</h3>
            <div className="task-detail-modal__status-buttons">
              {Object.entries(STATUS_LABELS).map(([statusKey, statusLabel]) => (
                <button
                  key={statusKey}
                  className={`task-detail-modal__status-btn ${
                    status === parseInt(statusKey) ? 'active' : ''
                  }`}
                  style={{
                    backgroundColor:
                      status === parseInt(statusKey) ? STATUS_COLORS[parseInt(statusKey)] : '#e5e7eb',
                    color: status === parseInt(statusKey) ? 'white' : '#6b7280',
                  }}
                  onClick={() => handleStatusChange(parseInt(statusKey))}
                >
                  {statusLabel}
                </button>
              ))}
            </div>
          </section>

          {/* Priority */}
          <section className="task-detail-modal__section">
            <h3 className="task-detail-modal__section-title">Priority</h3>
            <div className="task-detail-modal__button-group">
              {Object.entries(PRIORITY_LABELS).map(([priorityKey, priorityLabel]) => (
                <button
                  key={priorityKey}
                  className="task-detail-modal__status-btn"
                  style={{
                    backgroundColor: priority === parseInt(priorityKey) ? PRIORITY_COLORS[parseInt(priorityKey)] : '#e5e7eb',
                    color: priority === parseInt(priorityKey) ? 'white' : '#6b7280',
                  }}
                  onClick={() => handlePriorityChange(parseInt(priorityKey))}
                >
                  {priorityLabel}
                </button>
              ))}
            </div>
          </section>

          {/* Description */}
          {task.description && (
            <section className="task-detail-modal__section">
              <h3 className="task-detail-modal__section-title">Description</h3>
              <p className="task-detail-modal__description">{task.description}</p>
            </section>
          )}

          {/* Assignee */}
          <section className="task-detail-modal__section">
            <h3 className="task-detail-modal__section-title">Assigned To</h3>
            <select
              className="task-detail-modal__select"
              value={assignedToUserId || ''}
              onChange={(e) =>
                handleAssigneeChange(e.target.value ? parseInt(e.target.value) : null)
              }
            >
              <option value="">Unassigned</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.fullName || user.username}
                </option>
              ))}
            </select>
            {assignee && <p className="task-detail-modal__assignee-info">Currently: {assignee.fullName || assignee.username}</p>}
          </section>

          {/* Due Date */}
          <section className="task-detail-modal__section">
            <h3 className="task-detail-modal__section-title">Due Date</h3>
            <input
              type="date"
              className={`task-detail-modal__input ${isOverdue ? 'overdue' : isDueToday ? 'today' : ''}`}
              value={dueDate}
              onChange={(e) => handleDueDateChange(e.target.value)}
            />
            {isOverdue && <p className="task-detail-modal__warning">🔴 Overdue!</p>}
            {isDueToday && <p className="task-detail-modal__warning" style={{ color: '#f59e0b' }}>🟡 Due today!</p>}
          </section>

          {/* Metadata */}
          <section className="task-detail-modal__section task-detail-modal__section--compact">
            <div className="task-detail-modal__meta">
              <div>
                <p className="task-detail-modal__meta-label">Created By</p>
                <p className="task-detail-modal__meta-value">{task.createdByUserName || 'Unknown'}</p>
              </div>
              <div>
                <p className="task-detail-modal__meta-label">Created At</p>
                <p className="task-detail-modal__meta-value">
                  {new Date(task.createdAt).toLocaleDateString()}
                </p>
              </div>
              {task.updatedAt && (
                <div>
                  <p className="task-detail-modal__meta-label">Updated At</p>
                  <p className="task-detail-modal__meta-value">
                    {new Date(task.updatedAt).toLocaleDateString()}
                  </p>
                </div>
              )}
            </div>
          </section>

          {/* Comments Section */}
          {task && (
            <CommentSection 
              taskId={task.id} 
              users={users}
            />
          )}
        </div>

        <div className="task-detail-modal__footer">
          {onDelete && (
            <button
              className="task-detail-modal__btn task-detail-modal__btn--danger"
              onClick={() => {
                if (window.confirm('Are you sure you want to delete this task?')) {
                  onDelete(task.id);
                  onClose();
                }
              }}
            >
              🗑️ Delete Task
            </button>
          )}
          <button
            className="task-detail-modal__btn task-detail-modal__btn--secondary"
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
