import axios, { AxiosInstance } from 'axios';
import { Project, Page, BlockSchema, AuditLog, BlockSchemaVersion } from '../types';

const API_BASE_URL = 'http://localhost:5000/api';

class ApiService {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add token to requests
    this.client.interceptors.request.use((config) => {
      const token = localStorage.getItem('authToken');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    // Handle response errors
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          console.warn('[API] Unauthorized - clearing auth');
          localStorage.removeItem('authToken');
          localStorage.removeItem('authUser');
        }
        return Promise.reject(error);
      }
    );
  }

  private getCurrentUserId(): number | null {
    const userStr = localStorage.getItem('authUser');
    if (!userStr) return null;
    try {
      const user = JSON.parse(userStr);
      return user.id || null;
    } catch {
      return null;
    }
  }

  // Auth
  login(username: string, password: string) {
    console.log('[API] Login attempt:', username);
    return this.client.post('/auth/login', { username, password });
  }

  register(username: string, email: string, password: string, fullName?: string) {
    return this.client.post('/auth/register', { username, email, password, fullName });
  }

  verifyToken() {
    return this.client.get('/auth/verify');
  }

  // Admin - Users
  getAllUsers() {
    return this.client.get('/admin/users');
  }

  createUser(username: string, email: string, password: string, fullName: string, role: number, isActive: boolean) {
    return this.client.post('/admin/users', {
      username,
      email,
      password,
      fullName,
      role,
      isActive
    });
  }

  // Users
  getUser(userId: number) {
    return this.client.get(`/users/${userId}`);
  }

  updateUserSettings(userId: number, fullName: string, avatar: string, status: string) {
    return this.client.put(`/users/${userId}`, {
      fullName,
      avatar,
      status
    });
  }

  // Projects
  getProjects(userId: number = 1) {
    return this.client.get<Project[]>('/projects', { params: { userId } });
  }

  getProject(projectId: number) {
    return this.client.get<Project>(`/projects/${projectId}`);
  }

  createProject(name: string, description?: string, userId: number = 1) {
    return this.client.post<Project>('/projects', { name, description }, { params: { userId } });
  }

  updateProject(projectId: number, name: string, description?: string, userId: number = 1) {
    return this.client.put(`/projects/${projectId}`, { name, description }, { params: { userId } });
  }

  deleteProject(projectId: number, userId: number = 1) {
    return this.client.delete(`/projects/${projectId}`, { params: { userId } });
  }

  // Pages
  getPages(projectId: number) {
    return this.client.get<Page[]>(`/pages/project/${projectId}`);
  }

  createPage(projectId: number, name: string, order?: number, userId: number = 1) {
    return this.client.post<Page>('/pages', { name, order: order || 0 }, { 
      params: { projectId, userId } 
    });
  }

  updatePage(pageId: number, name: string, order: number, userId: number = 1) {
    return this.client.put(`/pages/${pageId}`, { name, order }, { params: { userId } });
  }

  deletePage(pageId: number, userId: number = 1) {
    return this.client.delete(`/pages/${pageId}`, { params: { userId } });
  }

  reorderPages(projectId: number, pages: { pageId: number; order: number }[], userId: number = 1) {
    return this.client.post(
      '/pages/reorder',
      { pages },
      { params: { projectId, userId } }
    );
  }

  // BlockSchemas
  getBlockSchemas(pageId: number) {
    return this.client.get<BlockSchema[]>(`/blockschemas/page/${pageId}`);
  }

  getBlockSchema(blockSchemaId: number) {
    return this.client.get<BlockSchema>(`/blockschemas/${blockSchemaId}`);
  }

  createBlockSchema(
    projectId: number,
    pageId: number,
    name: string,
    content: string,
    userId: number = 1
  ) {
    return this.client.post<BlockSchema>(
      '/blockschemas',
      { name, pageId, content },
      { params: { projectId, userId } }
    );
  }

  updateBlockSchema(
    blockSchemaId: number,
    name: string,
    content: string,
    changeDescription?: string,
    userId: number = 1
  ) {
    return this.client.put(
      `/blockschemas/${blockSchemaId}`,
      { name, content, changeDescription },
      { params: { userId } }
    );
  }

  deleteBlockSchema(blockSchemaId: number, userId: number = 1) {
    return this.client.delete(`/blockschemas/${blockSchemaId}`, { params: { userId } });
  }

  // Versions
  getVersionHistory(blockSchemaId: number) {
    return this.client.get<BlockSchemaVersion[]>(`/blockschemas/${blockSchemaId}/versions`);
  }

  revertToVersion(blockSchemaId: number, versionId: number, reason?: string, userId: number = 1) {
    return this.client.post(
      `/blockschemas/${blockSchemaId}/revert`,
      { versionId, reason },
      { params: { userId } }
    );
  }

  // Audit Logs
  getAuditLogs(projectId?: number, userId?: number, limit: number = 100) {
    return this.client.get<AuditLog[]>('/audit', {
      params: { projectId, userId, limit },
    });
  }

  getProjectAuditLogs(projectId: number, limit: number = 100) {
    return this.client.get<AuditLog[]>(`/audit/project/${projectId}`, {
      params: { limit },
    });
  }

  getUserAuditLogs(userId: number, limit: number = 100) {
    return this.client.get<AuditLog[]>(`/audit/user/${userId}`, {
      params: { limit },
    });
  }

  getBlockSchemaHistory(blockSchemaId: number) {
    return this.client.get<AuditLog[]>(`/audit/blockschema/${blockSchemaId}`);
  }

  // Tasks
  getAllTasks() {
    return this.client.get('/tasks');
  }

  getProjectTasks(projectId: number) {
    return this.client.get(`/tasks/project/${projectId}/list`);
  }

  getTaskBoard(projectId: number) {
    return this.client.get(`/tasks/project/${projectId}`);
  }

  getTask(taskId: number) {
    return this.client.get(`/tasks/${taskId}`);
  }

  createTask(data: {
    title: string;
    description?: string | null;
    priority: number;
    assignedToUserId?: number | null;
    dueDate?: string | null;
    status?: number;
  }) {
    const userId = this.getCurrentUserId();
    return this.client.post(`/tasks`, {
      ...data,
    }, { params: { userId } });
  }

  updateTask(taskId: number, data: {
    title?: string;
    description?: string;
    status?: number;
    priority?: number;
    assignedToUserId?: number | null;
    dueDate?: string;
  }) {
    const userId = this.getCurrentUserId();
    return this.client.put(`/tasks/${taskId}`, data, { params: { userId } });
  }

  reassignTask(taskId: number, newAssigneeId: number | null) {
    const userId = this.getCurrentUserId();
    return this.client.put(`/tasks/${taskId}/assignee`, {}, {
      params: { newAssigneeId, userId }
    });
  }

  changeTaskStatus(taskId: number, status: number) {
    return this.client.put(`/tasks/${taskId}/status`, {}, {
      params: { status }
    });
  }

  deleteTask(taskId: number) {
    const userId = this.getCurrentUserId();
    return this.client.delete(`/tasks/${taskId}`, {
      params: { userId }
    });
  }

  // Comments
  getTaskComments(taskId: number) {
    return this.client.get(`/comments/task/${taskId}`);
  }

  createTaskComment(taskId: number, data: { text: string }) {
    return this.client.post(`/comments/task/${taskId}`, data);
  }

  deleteTaskComment(commentId: number) {
    return this.client.delete(`/comments/${commentId}`);
  }

  // Notifications
  getMyNotifications(unreadOnly: boolean = false) {
    return this.client.get('/notifications/my', {
      params: { unreadOnly }
    });
  }

  getUnreadCount() {
    return this.client.get<number>('/notifications/unread-count');
  }

  markNotificationAsRead(notificationId: number) {
    return this.client.put(`/notifications/${notificationId}/read`, {});
  }

  markAllNotificationsAsRead() {
    return this.client.put('/notifications/mark-all-read', {});
  }

  deleteNotification(notificationId: number) {
    return this.client.delete(`/notifications/${notificationId}`);
  }

  // Export
  exportTasksToCsv(status?: number) {
    return this.client.get('/export/tasks/csv', {
      params: { status },
      responseType: 'blob'
    });
  }

  exportTasksToJson(status?: number) {
    return this.client.get('/export/tasks/json', {
      params: { status },
      responseType: 'blob'
    });
  }
}

export const apiService = new ApiService();
