import React, { useState } from 'react';
import { User } from '../types';
import '../styles/create-task-modal.css';

interface CreateTaskModalProps {
  isOpen: boolean;
  users: User[];
  onCreateTask: (
    title: string,
    description: string | undefined,
    dueDate: string | undefined,
    assignedToUserId: number | null | undefined,
    priority?: number
  ) => void;
  onClose: () => void;
}

export const CreateTaskModal: React.FC<CreateTaskModalProps> = ({
  isOpen,
  users,
  onCreateTask,
  onClose,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [assignedToUserId, setAssignedToUserId] = useState<number | null>(null);
  const [priority, setPriority] = useState<number>(1); // 0=Low, 1=Medium, 2=High, 3=Urgent
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      setError('Title is required');
      return;
    }

    onCreateTask(
      title.trim(),
      description.trim() || undefined,
      dueDate || undefined,
      assignedToUserId,
      priority
    );

    // Reset form
    setTitle('');
    setDescription('');
    setDueDate('');
    setAssignedToUserId(null);
    setPriority(1);
    setError(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="create-task-modal__overlay" onClick={onClose}>
      <div className="create-task-modal" onClick={(e) => e.stopPropagation()}>
        <div className="create-task-modal__header">
          <h2 className="create-task-modal__title">Create New Task</h2>
          <button className="create-task-modal__close" onClick={onClose}>
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="create-task-modal__form">
          {error && <div className="create-task-modal__error">{error}</div>}

          <div className="create-task-modal__field">
            <label className="create-task-modal__label">Task Title *</label>
            <input
              type="text"
              className="create-task-modal__input"
              placeholder="Enter task title..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
            />
          </div>

          <div className="create-task-modal__field">
            <label className="create-task-modal__label">Description</label>
            <textarea
              className="create-task-modal__textarea"
              placeholder="Enter task description..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
            />
          </div>

          <div className="create-task-modal__row">
            <div className="create-task-modal__field">
              <label className="create-task-modal__label">Due Date</label>
              <input
                type="date"
                className="create-task-modal__input"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>

            <div className="create-task-modal__field">
              <label className="create-task-modal__label">Priority</label>
              <select
                className="create-task-modal__select"
                value={priority}
                onChange={(e) => setPriority(parseInt(e.target.value))}
              >
                <option value="0">Low</option>
                <option value="1">Medium</option>
                <option value="2">High</option>
                <option value="3">Urgent</option>
              </select>
            </div>

            <div className="create-task-modal__field">
              <label className="create-task-modal__label">Assign To</label>
              <select
                className="create-task-modal__select"
                value={assignedToUserId || ''}
                onChange={(e) =>
                  setAssignedToUserId(e.target.value ? parseInt(e.target.value) : null)
                }
              >
                <option value="">Unassigned</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.fullName || user.username}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="create-task-modal__footer">
            <button
              type="button"
              className="create-task-modal__btn create-task-modal__btn--secondary"
              onClick={onClose}
            >
              Cancel
            </button>
            <button type="submit" className="create-task-modal__btn create-task-modal__btn--primary">
              Create Task
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
