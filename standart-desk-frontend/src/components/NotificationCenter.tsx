import React, { useState } from 'react';
import { Notification } from '../types';
import '../styles/notification-center.css';

interface NotificationCenterProps {
  notifications: Notification[];
  unreadCount: number;
  onNotificationRead: (notificationId: number) => void;
  onNotificationDelete: (notificationId: number) => void;
  onMarkAllAsRead: () => void;
}

const NOTIFICATION_ICONS: Record<string, string> = {
  TaskAssigned: '📋',
  TaskReassigned: '🔄',
  TaskCompleted: '✅',
  TaskCommented: '💬',
  TaskStatusChanged: '📊',
  TaskDueDate: '⏰',
};

export const NotificationCenter: React.FC<NotificationCenterProps> = ({
  notifications,
  unreadCount,
  onNotificationRead,
  onNotificationDelete,
  onMarkAllAsRead,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.isRead) {
      onNotificationRead(notification.id);
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;

    return date.toLocaleDateString();
  };

  return (
    <div className="notification-center">
      <button
        className="notification-center__toggle"
        onClick={() => setIsOpen(!isOpen)}
        title="Notifications"
      >
        🔔
        {unreadCount > 0 && (
          <span className="notification-center__badge">{unreadCount}</span>
        )}
      </button>

      {isOpen && (
        <div className="notification-center__panel">
          <div className="notification-center__header">
            <h3 className="notification-center__title">Notifications</h3>
            {unreadCount > 0 && (
              <button
                className="notification-center__mark-all"
                onClick={onMarkAllAsRead}
              >
                Mark all as read
              </button>
            )}
          </div>

          <div className="notification-center__list">
            {notifications.length === 0 ? (
              <div className="notification-center__empty">
                <span>No notifications</span>
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`notification-center__item ${
                    !notification.isRead ? 'unread' : ''
                  }`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <span className="notification-center__icon">
                    {NOTIFICATION_ICONS[notification.notificationTypeName] || '📢'}
                  </span>

                  <div className="notification-center__content">
                    <p className="notification-center__text">{notification.title}</p>
                    {notification.message && (
                      <p className="notification-center__message">
                        {notification.message}
                      </p>
                    )}
                    <span className="notification-center__time">
                      {formatTime(notification.createdAt)}
                    </span>
                  </div>

                  <button
                    className="notification-center__delete"
                    onClick={(e) => {
                      e.stopPropagation();
                      onNotificationDelete(notification.id);
                    }}
                    title="Delete"
                  >
                    ✕
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {isOpen && (
        <div
          className="notification-center__overlay"
          onClick={() => setIsOpen(false)}
        ></div>
      )}
    </div>
  );
};
