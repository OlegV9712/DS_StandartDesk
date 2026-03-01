export interface User {
  id: number;
  username: string;
  email: string;
  fullName?: string;
  avatar?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface Folder {
  id: number;
  name: string;
  ownerId: number;
  parentFolderId?: number | null;
  createdAt: string;
  updatedAt?: string;
  subFolders: Folder[];
  projects: Project[];
}

export interface Project {
  id: number;
  name: string;
  description?: string;
  ownerName: string;
  type: number; // 0 = Algorithm, 1 = AssistantBot
  folderId?: number | null;
  createdAt: string;
  updatedAt?: string;
  isArchived: boolean;
  currentOpenByUserName?: string;
  pages: Page[];
}

export interface Page {
  id: number;
  projectId: number;
  name: string;
  order: number;
  thumbnail?: string;
}

export interface BlockSchema {
  id: number;
  projectId: number;
  pageId: number;
  name: string;
  content: string;
  version: number;
  createdAt: string;
  updatedAt?: string;
}

export interface BlockSchemaVersion {
  id: number;
  versionNumber: number;
  content: string;
  createdByUserName: string;
  createdAt: string;
  changeDescription?: string;
}

export interface AuditLog {
  id: number;
  userName: string;
  action: string;
  entityType: string;
  oldValue?: string;
  newValue?: string;
  metadata?: string;
  createdAt: string;
}

export interface Block {
  id: string;
  // Algorithm blocks
  type: 'process' | 'decision' | 'data' | 'terminator' | 
    // Bot assistant blocks
    'start' | 'message' | 'button_container' | 'integration';
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color?: string;
  
  // For message blocks (bot responses)
  text?: string;
  
  // For button_container blocks
  buttons?: BlockButton[];
  
  // For integration blocks
  integrationConfig?: {
    method: string;
    parameters: Record<string, any>;
    description?: string;
  };
}

export interface BlockButton {
  id: string;
  label: string;
  nextBlockId?: string;
}

export interface Connection {
  id: string;
  fromBlockId: string;
  toBlockId: string;
  label?: string;
}

export interface BlockSchemaContent {
  blocks: Block[];
  connections: Connection[];
}

export interface TaskUser {
  id: number;
  username: string;
  fullName?: string;
  avatar?: string;
  email: string;
}

export interface Task {
  id: number;
  projectId: number;
  title: string;
  description?: string;
  status: number;
  priority: number;
  assignedToUserId?: number | null;
  assignedToUserName?: string;
  assignedToUserAvatar?: string;
  createdByUserId: number;
  createdByUserName?: string;
  dueDate?: string;
  createdAt: string;
  updatedAt?: string;
  displayOrder: number;
}

export interface Notification {
  id: number;
  userId: number;
  taskId: number;
  notificationType: number;
  notificationTypeName: string;
  title: string;
  message?: string;
  actionUrl?: string;
  fromUserId?: number;
  fromUserName?: string;
  fromUserAvatar?: string;
  isRead: boolean;
  createdAt: string;
  readAt?: string;
}

