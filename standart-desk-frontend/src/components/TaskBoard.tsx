import React, { useState } from 'react';
import { Task } from '../types';
import { TaskCard } from './TaskCard';
import '../styles/task-board.css';

interface TaskBoardProps {
  tasks: Task[];
  currentUserId: number;
  language?: 'en' | 'ru';
  onReassign: (taskId: number) => void;
  onViewDetails: (taskId: number) => void;
  onStatusChange: (taskId: number, newStatus: number) => void;
}

export const STATUS_LABELS_EN: Record<number, string> = {
  0: 'New',
  1: 'In Progress',
  2: 'In Review',
  3: 'Done',
};

export const STATUS_LABELS_RU: Record<number, string> = {
  0: 'Новая',
  1: 'В работе',
  2: 'На проверке',
  3: 'Завершена',
};

const STATUS_COLORS: Record<number, string> = {
  0: '#6b7280',
  1: '#f59e0b',
  2: '#3b82f6',
  3: '#10b981',
};

export const TaskBoard: React.FC<TaskBoardProps> = ({
  tasks,
  currentUserId,
  language = 'en',
  onReassign,
  onViewDetails,
  onStatusChange,
}) => {
  const [draggedTask, setDraggedTask] = useState<Task | null>(null);
  const [dragSource, setDragSource] = useState<number | null>(null);
  const statusLabels = language === 'ru' ? STATUS_LABELS_RU : STATUS_LABELS_EN;

  const getTasksByStatus = (status: number) => {
    return tasks.filter(task => task.status === status);
  };

  const handleDragStart = (task: Task, status: number) => {
    setDraggedTask(task);
    setDragSource(status);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.currentTarget.classList.add('drag-over');
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.currentTarget.classList.remove('drag-over');
  };

  const handleDrop = (e: React.DragEvent, status: number) => {
    e.preventDefault();
    e.currentTarget.classList.remove('drag-over');

    if (draggedTask && dragSource !== status) {
      onStatusChange(draggedTask.id, status);
      setDraggedTask(null);
      setDragSource(null);
    }
  };

  return (
    <div className="task-board">
      <div className="task-board__header">
        <h2 className="task-board__title">Task Board</h2>
      </div>

      <div className="task-board__columns">
        {[0, 1, 2, 3].map((status) => {
          const statusTasks = getTasksByStatus(status);
          const taskCount = statusTasks.length;

          return (
            <div
              key={status}
              className="task-column"
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, status)}
            >
              <div className="task-column__header">
                <div className="task-column__title-wrapper">
                  <div
                    className="task-column__status-dot"
                    style={{ backgroundColor: STATUS_COLORS[status] }}
                  ></div>
                  <h3 className="task-column__title">{statusLabels[status]}</h3>
                </div>
                <span className="task-column__count">{taskCount}</span>
              </div>

              <div className="task-column__tasks">
                {statusTasks.length === 0 ? (
                  <div className="task-column__empty">
                    <span>No tasks</span>
                  </div>
                ) : (
                  statusTasks.map((task) => (
                    <div
                      key={task.id}
                      draggable
                      onDragStart={() => handleDragStart(task, status)}
                      className="task-column__task-wrapper"
                    >
                      <TaskCard
                        task={task}
                        onReassign={onReassign}
                        onViewDetails={onViewDetails}
                        isAssignedToMe={task.assignedToUserId === currentUserId}
                      />
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
