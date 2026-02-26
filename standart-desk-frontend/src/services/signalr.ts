import { HubConnectionBuilder, LogLevel, HubConnection } from '@aspnet/signalr';

class SignalRService {
  private connection: HubConnection | null = null;
  private listeners: Map<string, Set<Function>> = new Map();

  async connect(projectId: number, userId: number, userName: string) {
    const url = `${(import.meta.env.VITE_SIGNALR_URL as string) || 'http://localhost:5001'}/hubs/project`;

    this.connection = new HubConnectionBuilder()
      .withUrl(url)
      .configureLogging(LogLevel.Information)
      .build();

    if (this.connection) {
      this.connection.on('ProjectOpenedNotification', (data: any) => {
        this.emit('ProjectOpened', data);
      });

      this.connection.on('BlockChanged', (data: any) => {
        this.emit('BlockChanged', data);
      });

      this.connection.on('PageAdded', (data: any) => {
        this.emit('PageAdded', data);
      });

      this.connection.on('PageDeleted', (data: any) => {
        this.emit('PageDeleted', data);
      });

      this.connection.on('PagesReordered', (data: any) => {
        this.emit('PagesReordered', data);
      });

      try {
        await this.connection.start();
        console.log('SignalR connected');

        // Join project
        if (this.connection.state === 1) { // Connected
          await this.connection.invoke('JoinProjectAsync', projectId, userId, userName);
        }
      } catch (err) {
        console.error('SignalR connection failed:', err);
      }
    }
  }

  async disconnect(projectId: number, userId: number) {
    if (this.connection) {
      try {
        await this.connection.invoke('LeaveProjectAsync', projectId, userId);
        await this.connection.stop();
      } catch (err) {
        console.error('Disconnect failed:', err);
      }
    }
  }

  async notifyBlockChanged(projectId: number, pageId: number, blockId: number, blockData: any) {
    if (this.connection?.state === 1) {
      try {
        await this.connection.invoke('NotifyBlockChangedAsync', projectId, pageId, blockId, blockData);
      } catch (err) {
        console.error('Failed to notify block change:', err);
      }
    }
  }

  async notifyPageAdded(projectId: number, pageId: number, pageName: string) {
    if (this.connection?.state === 1) {
      try {
        await this.connection.invoke('NotifyPageAddedAsync', projectId, pageId, pageName);
      } catch (err) {
        console.error('Failed to notify page added:', err);
      }
    }
  }

  async notifyPageDeleted(projectId: number, pageId: number) {
    if (this.connection?.state === 1) {
      try {
        await this.connection.invoke('NotifyPageDeletedAsync', projectId, pageId);
      } catch (err) {
        console.error('Failed to notify page deleted:', err);
      }
    }
  }

  async notifyPagesReordered(projectId: number, pageOrders: { pageId: number; order: number }[]) {
    if (this.connection?.state === 1) {
      try {
        await this.connection.invoke('NotifyPageReorderedAsync', projectId, pageOrders);
      } catch (err) {
        console.error('Failed to notify pages reordered:', err);
      }
    }
  }

  on(event: string, handler: Function) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)?.add(handler);
  }

  off(event: string, handler: Function) {
    const handlers = this.listeners.get(event);
    if (handlers) {
      handlers.delete(handler);
    }
  }

  private emit(event: string, data: any) {
    const handlers = this.listeners.get(event);
    if (handlers) {
      handlers.forEach((handler) => handler(data));
    }
  }
}

export const signalRService = new SignalRService();
