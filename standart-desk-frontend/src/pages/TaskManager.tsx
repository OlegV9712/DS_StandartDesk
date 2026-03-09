import React, { useState, useEffect } from 'react';
import { Task, User, Notification, TaskDomain } from '../types';
import { apiService } from '../services/api';
import { TaskBoard } from '../components/TaskBoard';
import { DomainPicker } from '../components/DomainPicker';
import { ReassignModal } from '../components/ReassignModal';
import { CreateTaskModal } from '../components/CreateTaskModal';
import { TaskDetailModal } from '../components/TaskDetailModal';
import { ExportModal } from '../components/ExportModal';
import { NotificationCenter } from '../components/NotificationCenter';
import { motion } from 'framer-motion';
import '../styles/task-manager.css';

interface AuthUser {
  id: number;
  username: string;
}

export const TaskManager: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [taskDomains, setTaskDomains] = useState<TaskDomain[]>([]);
  const [selectedDomainId, setSelectedDomainId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isReassignModalOpen, setIsReassignModalOpen] = useState(false);
  const [isCreateTaskModalOpen, setIsCreateTaskModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [language, setLanguage] = useState<'en' | 'ru'>('en');
  const [filterType, setFilterType] = useState<'all' | 'assigned' | 'unassigned'>('all');

  // Get current user from localStorage
  useEffect(() => {
    const userStr = localStorage.getItem('authUser');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        setCurrentUser(user);
      } catch (e) {
        console.error('Failed to parse auth user');
      }
    }
  }, []);

  // Load task domains
  useEffect(() => {
    const loadTaskDomains = async () => {
      try {
        const token = localStorage.getItem('authToken');
        const response = await fetch('/api/taskdomain/accessible', {
          headers: {
            'Authorization': token ? `Bearer ${token}` : ''
          }
        });
        if (response.ok) {
          const data = await response.json();
          setTaskDomains(data);
          // Set first domain as selected if any available
          if (data.length > 0) {
            setSelectedDomainId(data[0].id);
          }
        }
      } catch (err) {
        console.error('Failed to load task domains:', err);
      }
    };

    loadTaskDomains();
  }, []);

  // Load all tasks
  useEffect(() => {
    const loadTasks = async () => {
      try {
        setLoading(true);
        const response = await apiService.getAllTasks();
        setTasks(response.data);
        setError(null);
      } catch (err) {
        console.error('Failed to load tasks:', err);
        setError('Failed to load tasks');
      } finally {
        setLoading(false);
      }
    };

    loadTasks();
    // Refresh every 30 seconds
    const interval = setInterval(loadTasks, 30000);
    return () => clearInterval(interval);
  }, []);

  // Load users
  useEffect(() => {
    const loadUsers = async () => {
      try {
        const response = await apiService.getAllUsers();
        setUsers(response.data);
      } catch (err) {
        console.error('Failed to load users:', err);
      }
    };

    loadUsers();
  }, []);

  // Load notifications
  useEffect(() => {
    if (!currentUser?.id) return;

    const loadNotifications = async () => {
      try {
        const [notificationsRes, unreadRes] = await Promise.all([
          apiService.getMyNotifications(false),
          apiService.getUnreadCount(),
        ]);
        setNotifications(notificationsRes.data);
        setUnreadCount(unreadRes.data);
      } catch (err) {
        console.error('Failed to load notifications:', err);
      }
    };

    loadNotifications();
    // Refresh every 10 seconds
    const interval = setInterval(loadNotifications, 10000);
    return () => clearInterval(interval);
  }, [currentUser?.id]);

  const handleReassignClick = (taskId: number) => {
    setSelectedTaskId(taskId);
    setIsReassignModalOpen(true);
  };

  const handleViewDetails = (taskId: number) => {
    setSelectedTaskId(taskId);
    setIsDetailModalOpen(true);
  };

  const handleCreateTask = async (
    title: string,
    description: string | undefined,
    dueDate: string | undefined,
    assignedToUserId: number | null | undefined,
    priority: number = 1
  ) => {
    try {
      const response = await apiService.createTask({
        title,
        description: description || null,
        dueDate: dueDate || null,
        assignedToUserId: assignedToUserId || null,
        status: 0, // To Do
        priority: priority, // Use passed priority
        taskDomainId: selectedDomainId || null
      });

      // Add new task to the list
      setTasks([response.data, ...tasks]);
      setIsCreateTaskModalOpen(false);
    } catch (err) {
      console.error('Failed to create task:', err);
      setError('Failed to create task');
    }
  };

  const handleUpdateTask = async (
    taskId: number,
    updates: {
      status?: number;
      priority?: number;
      assignedToUserId?: number | null;
      dueDate?: string;
    }
  ) => {
    try {
      await apiService.updateTask(taskId, updates);

      // Update local state
      setTasks(
        tasks.map((task) => (task.id === taskId ? { ...task, ...updates } : task))
      );
    } catch (err) {
      console.error('Failed to update task:', err);
      setError('Failed to update task');
    }
  };

  const handleDeleteTask = async (taskId: number) => {
    try {
      await apiService.deleteTask(taskId);
      setTasks(tasks.filter(t => t.id !== taskId));
      setError(null);
    } catch (err) {
      console.error('Failed to delete task:', err);
      setError('Failed to delete task');
    }
  };

  const handleReassign = async (newAssigneeId: number | null) => {
    if (!selectedTaskId) return;

    try {
      await apiService.reassignTask(selectedTaskId, newAssigneeId);

      // Update local state
      setTasks(
        tasks.map((task) =>
          task.id === selectedTaskId
            ? { ...task, assignedToUserId: newAssigneeId }
            : task
        )
      );

      setIsReassignModalOpen(false);
      setSelectedTaskId(null);
    } catch (err) {
      console.error('Failed to reassign task:', err);
      setError('Failed to reassign task');
    }
  };

  const handleStatusChange = async (taskId: number, newStatus: number) => {
    try {
      await apiService.changeTaskStatus(taskId, newStatus);

      // Update local state
      setTasks(
        tasks.map((task) =>
          task.id === taskId ? { ...task, status: newStatus } : task
        )
      );
    } catch (err) {
      console.error('Failed to change task status:', err);
      setError('Failed to change task status');
    }
  };

  const handleNotificationRead = async (notificationId: number) => {
    try {
      await apiService.markNotificationAsRead(notificationId);

      // Update local state
      setNotifications(
        notifications.map((n) =>
          n.id === notificationId ? { ...n, isRead: true } : n
        )
      );
      setUnreadCount(Math.max(0, unreadCount - 1));
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  };

  const handleNotificationDelete = async (notificationId: number) => {
    try {
      await apiService.deleteNotification(notificationId);

      // Update local state
      const notification = notifications.find((n) => n.id === notificationId);
      setNotifications(notifications.filter((n) => n.id !== notificationId));
      if (notification && !notification.isRead) {
        setUnreadCount(Math.max(0, unreadCount - 1));
      }
    } catch (err) {
      console.error('Failed to delete notification:', err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await apiService.markAllNotificationsAsRead();

      // Update local state
      setNotifications(notifications.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Failed to mark all notifications as read:', err);
    }
  };

  // Filter tasks based on selected filter and domain
  const getFilteredTasks = () => {
    let filtered = tasks;

    // Filter by domain
    if (selectedDomainId) {
      filtered = filtered.filter(t => t.taskDomainId === selectedDomainId);
    }

    // Filter by assignment status
    if (filterType === 'all') {
      return filtered;
    } else if (filterType === 'assigned') {
      // Tasks assigned to current user
      return filtered.filter(t => t.assignedToUserId === currentUser?.id);
    } else if (filterType === 'unassigned') {
      // Tasks with no assignee
      return filtered.filter(t => !t.assignedToUserId);
    }
    return filtered;
  };

  const filteredTasks = getFilteredTasks();

  const selectedTask = selectedTaskId
    ? tasks.find((t) => t.id === selectedTaskId)
    : null;

  return (
    <div className="task-manager">
      <header className="task-manager__header">
        <h1 className="task-manager__title">{language === 'ru' ? 'Управление задачами' : 'Task Manager'}</h1>
        <div className="task-manager__header-actions">
          {/* Language switcher */}
          <div className="task-manager__language-switcher">
            <button
              className={`lang-btn ${language === 'en' ? 'active' : ''}`}
              onClick={() => setLanguage('en')}
              title="English"
            >
              EN
            </button>
            <button
              className={`lang-btn ${language === 'ru' ? 'active' : ''}`}
              onClick={() => setLanguage('ru')}
              title="Русский"
            >
              RU
            </button>
          </div>

          <button
            className="task-manager__create-btn"
            onClick={() => setIsCreateTaskModalOpen(true)}
            title={language === 'ru' ? 'Создать новую задачу' : 'Create new task'}
          >
            {language === 'ru' ? '➕ Новая задача' : '➕ New Task'}
          </button>
          <button
            className="task-manager__export-btn"
            onClick={() => setIsExportModalOpen(true)}
            title={language === 'ru' ? 'Экспортировать задачи' : 'Export tasks'}
          >
            {language === 'ru' ? '📥 Экспорт' : '📥 Export'}
          </button>
          <NotificationCenter
            notifications={notifications}
            unreadCount={unreadCount}
            onNotificationRead={handleNotificationRead}
            onNotificationDelete={handleNotificationDelete}
            onMarkAllAsRead={handleMarkAllAsRead}
          />

          {/* Task Domain Switcher */}
          {taskDomains.length > 0 && (
            <div className="task-manager__domain-switcher">
              <DomainPicker
                domains={taskDomains}
                selectedDomainId={selectedDomainId}
                onSelect={(domainId) => setSelectedDomainId(domainId)}
                language={language}
              />
            </div>
          )}
        </div>
      </header>

      {/* Filter toolbar */}
      <div className="task-manager__filters">
        <div className="task-manager__filter-group">
          <span className="task-manager__filter-label">
            {language === 'ru' ? 'Фильтр:' : 'Filter:'}
          </span>
          <button
            className={`filter-btn ${filterType === 'all' ? 'active' : ''}`}
            onClick={() => setFilterType('all')}
          >
            {language === 'ru' ? 'Все задачи' : 'All Tasks'}
          </button>
          <button
            className={`filter-btn ${filterType === 'assigned' ? 'active' : ''}`}
            onClick={() => setFilterType('assigned')}
          >
            {language === 'ru' ? 'Назначены на меня' : 'Assigned to Me'}
          </button>
          <button
            className={`filter-btn ${filterType === 'unassigned' ? 'active' : ''}`}
            onClick={() => setFilterType('unassigned')}
          >
            {language === 'ru' ? 'Нераспределённые' : 'Unassigned'}
          </button>
        </div>
      </div>

      {error && <div className="task-manager__error">{error}</div>}

      {loading ? (
        <div className="task-manager__loading">
          <div className="spinner"></div>
          <p>{language === 'ru' ? 'Загрузка задач...' : 'Loading tasks...'}</p>
        </div>
      ) : (
        <TaskBoard
          tasks={filteredTasks}
          currentUserId={currentUser?.id || 0}
          language={language}
          onReassign={handleReassignClick}
          onViewDetails={handleViewDetails}
          onStatusChange={handleStatusChange}
        />
      )}

      {selectedTask && (
        <ReassignModal
          isOpen={isReassignModalOpen}
          taskId={selectedTask.id}
          taskTitle={selectedTask.title}
          currentAssignee={selectedTask.assignedToUserName}
          users={users}
          onReassign={handleReassign}
          onClose={() => setIsReassignModalOpen(false)}
        />
      )}

      <CreateTaskModal
        isOpen={isCreateTaskModalOpen}
        users={users}
        onCreateTask={handleCreateTask}
        onClose={() => setIsCreateTaskModalOpen(false)}
        taskDomains={taskDomains}
        selectedDomainId={selectedDomainId}
        language={language}
      />

      {selectedTask && (
        <TaskDetailModal
          isOpen={isDetailModalOpen}
          task={selectedTask}
          users={users}
          taskDomains={taskDomains}
          onUpdateTask={handleUpdateTask}
          onDelete={handleDeleteTask}
          onClose={() => setIsDetailModalOpen(false)}
          language={language}
        />
      )}

      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
      />
    </div>
  );
};
