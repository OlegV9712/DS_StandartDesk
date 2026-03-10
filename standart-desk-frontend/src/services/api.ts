import axios, { AxiosInstance, AxiosError } from 'axios';
import { Project, Page, BlockSchema, AuditLog, BlockSchemaVersion } from '../types';

// Get API base URL - use relative path for same-origin requests through Nginx proxy
const getApiBaseUrl = () => {
  // Use relative path /api instead of absolute URL
  // This way it goes through Nginx proxy on same domain
  return '/api';
};

const API_BASE_URL = getApiBaseUrl();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

interface CacheEntry {
  data: any;
  timestamp: number;
}

class ApiService {
  private client: AxiosInstance;
  private cache: Map<string, CacheEntry> = new Map();
  private requestQueue: Map<string, Promise<any>> = new Map();

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 10000,
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
      (error: AxiosError) => {
        if (error.response?.status === 401) {
          console.warn('[API] Unauthorized - logging out and redirecting to login');
          localStorage.removeItem('authToken');
          localStorage.removeItem('authUser');
          // Trigger logout event
          window.dispatchEvent(new CustomEvent('logout'));
          // Redirect to login page
          if (typeof window !== 'undefined') {
            window.location.href = '/login?session_expired=true';
          }
        }
        return Promise.reject(error);
      }
    );
  }

  /**
   * Check if cache is still valid
   */
  private isCacheValid(cacheKey: string): boolean {
    const entry = this.cache.get(cacheKey);
    if (!entry) return false;
    return Date.now() - entry.timestamp < CACHE_DURATION;
  }

  /**
   * Get from cache or execute request
   */
  private async getCachedOrFetch<T>(
    cacheKey: string,
    fetchFn: () => Promise<T>,
    useCache: boolean = true
  ): Promise<T> {
    // Return cached data if valid
    if (useCache && this.isCacheValid(cacheKey)) {
      const entry = this.cache.get(cacheKey);
      if (entry) return entry.data as T;
    }

    // Avoid duplicate requests
    if (this.requestQueue.has(cacheKey)) {
      return this.requestQueue.get(cacheKey)!;
    }

    const request = fetchFn()
      .then((data) => {
        // Cache the result
        this.cache.set(cacheKey, {
          data,
          timestamp: Date.now(),
        });
        this.requestQueue.delete(cacheKey);
        return data;
      })
      .catch((error) => {
        this.requestQueue.delete(cacheKey);
        throw error;
      });

    this.requestQueue.set(cacheKey, request);
    return request;
  }

  /**
   * Clear cache for a specific key or all
   */
  public clearCache(key?: string): void {
    if (key) {
      this.cache.delete(key);
    } else {
      this.cache.clear();
    }
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

  // Auth endpoints
  async login(username: string, password: string) {
    const response = await this.client.post('/auth/login', { username, password });
    return response.data;
  }

  async register(username: string, email: string, password: string, fullName?: string) {
    const response = await this.client.post('/auth/register', {
      username,
      email,
      password,
      fullName,
    });
    return response.data;
  }

  async verifyToken() {
    return this.getCachedOrFetch(
      'verify-token',
      () => this.client.get('/auth/verify').then(res => res.data),
      false // Don't cache token verification
    );
  }

  // Projects endpoints
  async getProjects(useCache = true): Promise<Project[]> {
    const userId = this.getCurrentUserId();
    return this.getCachedOrFetch(
      `projects-${userId}`,
      () => this.client.get(`/projects?userId=${userId}`).then(res => res.data),
      useCache
    );
  }

  async getProject(id: number, useCache = true): Promise<Project> {
    return this.getCachedOrFetch(
      `project-${id}`,
      () => this.client.get(`/projects/${id}`).then(res => res.data),
      useCache
    );
  }

  async createProject(name: string, description: string, type: number, folderId?: number) {
    const response = await this.client.post('/projects', {
      name,
      description,
      type,
      folderId,
    });
    this.clearCache(`projects-${this.getCurrentUserId()}`);
    return response.data;
  }

  async updateProject(id: number, data: Partial<Project>) {
    const response = await this.client.put(`/projects/${id}`, data);
    this.clearCache(`project-${id}`);
    this.clearCache(`projects-${this.getCurrentUserId()}`);
    return response.data;
  }

  async deleteProject(id: number) {
    const response = await this.client.delete(`/projects/${id}`);
    this.clearCache(`project-${id}`);
    this.clearCache(`projects-${this.getCurrentUserId()}`);
    return response.data;
  }

  // Pages endpoints
  async getPages(projectId: number, useCache = true): Promise<Page[]> {
    return this.getCachedOrFetch(
      `pages-${projectId}`,
      () => this.client.get(`/pages?projectId=${projectId}`).then(res => res.data),
      useCache
    );
  }

  async createPage(projectId: number, name: string, order: number) {
    const response = await this.client.post('/pages', { projectId, name, order });
    this.clearCache(`pages-${projectId}`);
    return response.data;
  }

  // BlockSchemas endpoints
  async getBlockSchemas(projectId: number, useCache = true): Promise<BlockSchema[]> {
    return this.getCachedOrFetch(
      `blockschemas-${projectId}`,
      () => this.client.get(`/blockschemas?projectId=${projectId}`).then(res => res.data),
      useCache
    );
  }

  async getBlockSchemaVersions(blockSchemaId: number): Promise<BlockSchemaVersion[]> {
    return this.getCachedOrFetch(
      `blockschema-versions-${blockSchemaId}`,
      () => this.client.get(`/blockschemas/${blockSchemaId}/versions`).then(res => res.data),
      true
    );
  }

  async createBlockSchema(projectId: number, name: string, description: string, data: any) {
    const response = await this.client.post('/blockschemas', {
      projectId,
      name,
      description,
      data,
    });
    this.clearCache(`blockschemas-${projectId}`);
    return response.data;
  }

  async saveBlockSchemaVersion(blockSchemaId: number, data: any) {
    const response = await this.client.post(`/blockschemas/${blockSchemaId}/versions`, { data });
    this.clearCache(`blockschema-versions-${blockSchemaId}`);
    return response.data;
  }

  // AuditLogs endpoints
  async getAuditLogs(entityId?: number, entityType?: string): Promise<AuditLog[]> {
    return this.client
      .get('/audit', {
        params: { entityId, entityType },
      })
      .then(res => res.data);
  }

  // Folders endpoints
  async getFolders(userId?: number): Promise<any[]> {
    return this.client
      .get('/folders', {
        params: { userId },
      })
      .then(res => res.data);
  }

  async createFolder(name: string, description?: string, ownerId?: number): Promise<any> {
    return this.client
      .post('/folders', { name, description, ownerId })
      .then(res => res.data);
  }

  async updateFolder(folderId: number, name: string): Promise<any> {
    return this.client
      .put(`/folders/${folderId}`, { name })
      .then(res => res.data);
  }

  async deleteFolder(folderId: number): Promise<any> {
    return this.client
      .delete(`/folders/${folderId}`)
      .then(res => res.data);
  }

  // Tasks endpoints
  async getAllTasks(): Promise<any> {
    return this.client.get('/tasks');
  }

  async createTask(taskData: any): Promise<any> {
    // Extract userId from localStorage to pass as query parameter
    const userStr = localStorage.getItem('authUser');
    let userId = 1; // Default fallback
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        userId = user.id;
      } catch (e) {
        console.warn('Failed to parse auth user for task creation');
      }
    }
    return this.client.post(`/tasks?userId=${userId}`, taskData);
  }

  async updateTask(taskId: number, updates: any): Promise<any> {
    return this.client.put(`/tasks/${taskId}`, updates);
  }

  async deleteTask(taskId: number): Promise<any> {
    return this.client.delete(`/tasks/${taskId}`);
  }

  async reassignTask(taskId: number, newAssigneeId: number): Promise<any> {
    return this.client.put(`/tasks/${taskId}/reassign`, { assignedToUserId: newAssigneeId });
  }

  async changeTaskStatus(taskId: number, newStatus: number): Promise<any> {
    return this.client.put(`/tasks/${taskId}/status`, { status: newStatus });
  }

  // Users endpoints
  async getAllUsers(): Promise<any> {
    return this.client.get('/users');
  }

 // Notifications endpoints
  async getMyNotifications(unreadOnly: boolean = true): Promise<any> {
    return this.client.get('/notifications', { params: { unreadOnly } });
  }

  async getUnreadCount(): Promise<any> {
    return this.client.get('/notifications/unread-count');
  }

  async markNotificationAsRead(notificationId: number): Promise<any> {
    return this.client.put(`/notifications/${notificationId}/read`);
  }

  async deleteNotification(notificationId: number): Promise<any> {
    return this.client.delete(`/notifications/${notificationId}`);
  }

  async markAllNotificationsAsRead(): Promise<any> {
    return this.client.put('/notifications/mark-all-read');
  }

  // BlockSchema endpoints
  async updateBlockSchema(blockSchemaId: number, data: any): Promise<any> {
    return this.client.put(`/blockschemas/${blockSchemaId}`, data);
  }

  async buildScenario(blockSchemaId: number, userId?: number): Promise<any> {
    return this.client.post(`/blockschemas/${blockSchemaId}/build`, { userId });
  }

  // Settings endpoints
  async updateUserSettings(userId: number, fullName: string, avatar: string, status: string): Promise<any> {
    return this.client.put(`/users/${userId}/settings`, { fullName, avatar, status });
  }

  // Comments endpoints
  async getTaskComments(taskId: number): Promise<any> {
    return this.client.get(`/comments?taskId=${taskId}`);
  }

  async createTaskComment(taskId: number, data: any): Promise<any> {
    return this.client.post(`/comments`, { taskId, ...data });
  }

  async deleteTaskComment(commentId: number): Promise<any> {
    return this.client.delete(`/comments/${commentId}`);
  }
}

export default new ApiService();
export const apiService = new ApiService();
