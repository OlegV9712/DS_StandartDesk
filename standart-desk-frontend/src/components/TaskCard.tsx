import React from 'react';
import { Task } from '../types';
import '../styles/task-card.css';

interface TaskCardProps {
  task: Task;
  onReassign: (taskId: number) => void;
  onViewDetails: (taskId: number) => void;
  isAssignedToMe: boolean;
}

const PRIORITY_COLORS: Record<number, string> = {
  0: '#10b981', // Low - Green
  1: '#f59e0b', // Medium - Amber
  2: '#ef4444', // High - Red
  3: '#7c3aed', // Critical - Violet
};

const PRIORITY_LABELS: Record<number, string> = {
  0: 'Low',
  1: 'Medium',
  2: 'High',
  3: 'Critical',
};

export const TaskCard: React.FC<TaskCardProps> = ({ task, onReassign, onViewDetails, isAssignedToMe }) => {
  // Calculate due date status
  const dueDateObj = task.dueDate ? new Date(task.dueDate) : null;
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dueDay = dueDateObj ? new Date(dueDateObj.getFullYear(), dueDateObj.getMonth(), dueDateObj.getDate()) : null;
  
  const isOverdue = dueDay && dueDay < today;
  const isDueToday = dueDay && dueDay.getTime() === today.getTime();
  const isDueSoon = !isOverdue && !isDueToday && dueDay && dueDay.getTime() - today.getTime() <= 3 * 24 * 60 * 60 * 1000; // 3 days

  const cardClassName = `task-card ${isOverdue ? 'task-card--overdue' : isDueToday ? 'task-card--today' : isDueSoon ? 'task-card--soon' : ''}`;

  return (
    <div
      className={cardClassName}
      onClick={() => onViewDetails(task.id)}
      role="button"
      tabIndex={0}
    >
      <div className="task-card__header">
        <span className="task-card__id">#{task.id}</span>
        <div className="task-card__priority" style={{ backgroundColor: PRIORITY_COLORS[task.priority] }}>
          {PRIORITY_LABELS[task.priority]}
        </div>
      </div>

      <h3 className="task-card__title">{task.title}</h3>

      {task.description && (
        <p className="task-card__description">{task.description}</p>
      )}

      <div className="task-card__footer">
        <div className="task-card__assignee">
          {task.assignedToUserAvatar && (
            <span className="task-card__avatar">{task.assignedToUserAvatar}</span>
          )}
          <span className="task-card__assignee-name">
            {isAssignedToMe ? '👤 Me' : task.assignedToUserName || 'Unassigned'}
          </span>
          {isAssignedToMe && (
            <button
              className="task-card__reassign-btn"
              onClick={(e) => {
                e.stopPropagation();
                onReassign(task.id);
              }}
              title="Reassign task"
            >
              ⟳
            </button>
          )}
        </div>

        {task.dueDate && (
          <div className={`task-card__due-date ${isOverdue ? 'overdue' : isDueToday ? 'today' : isDueSoon ? 'soon' : ''}`}>
            {isOverdue && '🔴'} {isDueToday && '🟡'} {isDueSoon && '🟠'} {new Date(task.dueDate).toLocaleDateString()}
          </div>
        )}
      </div>
    </div>
  );
};
