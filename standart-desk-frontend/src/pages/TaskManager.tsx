import React, { useState, useEffect } from 'react';
import { Task, User, Notification } from '../types';
import { apiService } from '../services/api';
import { TaskBoard } from '../components/TaskBoard';
import { ReassignModal } from '../components/ReassignModal';
import { CreateTaskModal } from '../components/CreateTaskModal';
import { TaskDetailModal } from '../components/TaskDetailModal';
import { ExportModal } from '../components/ExportModal';
import { NotificationCenter } from '../components/NotificationCenter';
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isReassignModalOpen, setIsReassignModalOpen] = useState(false);
  const [isCreateTaskModalOpen, setIsCreateTaskModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);

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

  const selectedTask = selectedTaskId
    ? tasks.find((t) => t.id === selectedTaskId)
    : null;

  return (
    <div className="task-manager">
      <header className="task-manager__header">
        <h1 className="task-manager__title">Task Manager</h1>
        <div className="task-manager__header-actions">
          <button
            className="task-manager__create-btn"
            onClick={() => setIsCreateTaskModalOpen(true)}
            title="Create new task"
          >
            ➕ New Task
          </button>
          <button
            className="task-manager__export-btn"
            onClick={() => setIsExportModalOpen(true)}
            title="Export tasks"
          >
            📥 Export
          </button>
          <NotificationCenter
            notifications={notifications}
            unreadCount={unreadCount}
            onNotificationRead={handleNotificationRead}
            onNotificationDelete={handleNotificationDelete}
            onMarkAllAsRead={handleMarkAllAsRead}
          />
        </div>
      </header>

      {error && <div className="task-manager__error">{error}</div>}

      {loading ? (
        <div className="task-manager__loading">
          <div className="spinner"></div>
          <p>Loading tasks...</p>
        </div>
      ) : (
        <TaskBoard
          tasks={tasks}
          currentUserId={currentUser?.id || 0}
          onReassign={handleReassignClick}
          onViewDetails={handleViewDetails}
          onStatusChange={handleStatusChange}
          onDelete={handleDeleteTask}
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
      />

      {selectedTask && (
        <TaskDetailModal
          isOpen={isDetailModalOpen}
          task={selectedTask}
          users={users}
          onUpdateTask={handleUpdateTask}
          onDelete={handleDeleteTask}
          onClose={() => setIsDetailModalOpen(false)}
        />
      )}

      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
      />
    </div>
  );
};
