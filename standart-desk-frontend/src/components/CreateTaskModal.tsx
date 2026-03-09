import React, { useState } from 'react';
import { User, TaskDomain } from '../types';
import { DomainPicker } from './DomainPicker';
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
  taskDomains?: TaskDomain[];
  selectedDomainId?: number | null;
  language?: 'en' | 'ru';
}

export const CreateTaskModal: React.FC<CreateTaskModalProps> = ({
  isOpen,
  users,
  onCreateTask,
  onClose,
  taskDomains = [],
  selectedDomainId,
  language = 'en',
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [assignedToUserId, setAssignedToUserId] = useState<number | null>(null);
  const [priority, setPriority] = useState<number>(1);
  const [taskDomainId, setTaskDomainId] = useState<number | null>(selectedDomainId || null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      setError(language === 'ru' ? 'Название обязательно' : 'Title is required');
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
    setTaskDomainId(selectedDomainId || null);
    setError(null);
    onClose();
  };

  // Update taskDomainId when selectedDomainId changes
  React.useEffect(() => {
    setTaskDomainId(selectedDomainId || null);
  }, [selectedDomainId]);

  if (!isOpen) return null;

  const translations = language === 'ru' ? {
    title: 'Создать новую задачу',
    taskTitle: 'Название задачи',
    required: '*',
    description: 'Описание',
    dueDate: 'Срок выполнения',
    priority: 'Приоритет',
    assignTo: 'Назначить на',
    low: 'Низкий',
    medium: 'Средний',
    high: 'Высокий',
    urgent: 'Критичный',
    unassigned: 'Не назначена',
    cancel: 'Отмена',
    create: 'Создать',
    domain: 'Область'
  } : {
    title: 'Create New Task',
    taskTitle: 'Task Title',
    required: '*',
    description: 'Description',
    dueDate: 'Due Date',
    priority: 'Priority',
    assignTo: 'Assign To',
    low: 'Low',
    medium: 'Medium',
    high: 'High',
    urgent: 'Urgent',
    unassigned: 'Unassigned',
    cancel: 'Cancel',
    create: 'Create Task',
    domain: 'Domain'
  };

  return (
    <div className="create-task-modal__overlay" onClick={onClose}>
      <div className="create-task-modal" onClick={(e) => e.stopPropagation()}>
        <div className="create-task-modal__header">
          <h2 className="create-task-modal__title">{translations.title}</h2>
          <button className="create-task-modal__close" onClick={onClose}>
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="create-task-modal__form">
          {error && <div className="create-task-modal__error">{error}</div>}

          <div className="create-task-modal__field">
            <label className="create-task-modal__label">{translations.taskTitle} {translations.required}</label>
            <input
              type="text"
              className="create-task-modal__input"
              placeholder={language === 'ru' ? 'Введите название задачи...' : 'Enter task title...'}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
            />
          </div>

          <div className="create-task-modal__field">
            <label className="create-task-modal__label">{translations.description}</label>
            <textarea
              className="create-task-modal__textarea"
              placeholder={language === 'ru' ? 'Введите описание задачи...' : 'Enter task description...'}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
            />
          </div>

          {selectedDomainId && (
            <div className="create-task-modal__field">
              <label className="create-task-modal__label">{translations.domain}</label>
              <div className="create-task-modal__domain-display">
                {taskDomains.find(d => d.id === selectedDomainId)?.icon} {taskDomains.find(d => d.id === selectedDomainId)?.name}
              </div>
            </div>
          )}

          <div className="create-task-modal__row">
            <div className="create-task-modal__field">
              <label className="create-task-modal__label">{translations.dueDate}</label>
              <input
                type="date"
                className="create-task-modal__input"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>

            <div className="create-task-modal__field">
              <label className="create-task-modal__label">{translations.priority}</label>
              <select
                className="create-task-modal__select"
                value={priority}
                onChange={(e) => setPriority(parseInt(e.target.value))}
              >
                <option value="0">{translations.low}</option>
                <option value="1">{translations.medium}</option>
                <option value="2">{translations.high}</option>
                <option value="3">{translations.urgent}</option>
              </select>
            </div>

            <div className="create-task-modal__field">
              <label className="create-task-modal__label">{translations.assignTo}</label>
              <select
                className="create-task-modal__select"
                value={assignedToUserId || ''}
                onChange={(e) =>
                  setAssignedToUserId(e.target.value ? parseInt(e.target.value) : null)
                }
              >
                <option value="">{translations.unassigned}</option>
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
              {translations.cancel}
            </button>
            <button type="submit" className="create-task-modal__btn create-task-modal__btn--primary">
              {translations.create}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
