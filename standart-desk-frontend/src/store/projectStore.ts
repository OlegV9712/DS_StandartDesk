import { create } from 'zustand';
import { Project, Page, BlockSchema } from '../types';
import { apiService } from '../services/api';

interface ProjectStore {
  projects: Project[];
  currentProject: Project | null;
  currentPage: Page | null;
  blockSchemas: BlockSchema[];
  loading: boolean;
  error: string | null;

  // Actions
  fetchProjects: (userId?: number) => Promise<void>;
  fetchProject: (projectId: number) => Promise<void>;
  createProject: (name: string, description?: string, userId?: number) => Promise<Project | null>;
  updateProject: (projectId: number, name: string, description?: string, userId?: number) => Promise<void>;
  deleteProject: (projectId: number, userId?: number) => Promise<void>;
  setCurrentProject: (project: Project | null) => void;
  setCurrentPage: (page: Page | null) => void;
  addPage: (page: Page) => void;
  removePage: (pageId: number) => void;
  updatePages: (pages: Page[]) => void;
  setBlockSchemas: (schemas: BlockSchema[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useProjectStore = create<ProjectStore>((set: any) => ({
  projects: [],
  currentProject: null,
  currentPage: null,
  blockSchemas: [],
  loading: false,
  error: null,

  fetchProjects: async (userId = 1) => {
    set({ loading: true, error: null });
    try {
      const response = await apiService.getProjects(userId);
      set({ projects: response.data, loading: false });
    } catch (err: any) {
      set({ 
        error: err.message || 'Failed to fetch projects',
        loading: false 
      });
    }
  },

  fetchProject: async (projectId: number) => {
    set({ loading: true, error: null });
    try {
      const response = await apiService.getProject(projectId);
      set({ currentProject: response.data, loading: false });
    } catch (err: any) {
      set({ 
        error: err.message || 'Failed to fetch project',
        loading: false 
      });
    }
  },

  createProject: async (name: string, description?: string, userId = 1) => {
    set({ loading: true, error: null });
    try {
      const response = await apiService.createProject(name, description, userId);
      const newProject = response.data;
      set((state: any) => ({
        projects: [...state.projects, newProject],
        loading: false
      }));
      return newProject;
    } catch (err: any) {
      set({ 
        error: err.message || 'Failed to create project',
        loading: false 
      });
      return null;
    }
  },

  updateProject: async (projectId: number, name: string, description?: string, userId = 1) => {
    set({ loading: true, error: null });
    try {
      await apiService.updateProject(projectId, name, description, userId);
      set((state: any) => ({
        projects: state.projects.map((p: any) => 
          p.id === projectId ? { ...p, name, description } : p
        ),
        currentProject: state.currentProject?.id === projectId 
          ? { ...state.currentProject, name, description }
          : state.currentProject,
        loading: false
      }));
    } catch (err: any) {
      set({ 
        error: err.message || 'Failed to update project',
        loading: false 
      });
    }
  },

  deleteProject: async (projectId: number, userId = 1) => {
    set({ loading: true, error: null });
    try {
      await apiService.deleteProject(projectId, userId);
      set((state: any) => ({
        projects: state.projects.filter((p: any) => p.id !== projectId),
        loading: false
      }));
    } catch (err: any) {
      set({ 
        error: err.message || 'Failed to delete project',
        loading: false 
      });
    }
  },

  setCurrentProject: (project: Project | null) => {
    set({ currentProject: project });
  },

  setCurrentPage: (page: Page | null) => {
    set({ currentPage: page });
  },

  addPage: (page: Page) => {
    set((state: any) => ({
      currentProject: state.currentProject 
        ? { ...state.currentProject, pages: [...state.currentProject.pages, page] }
        : null
    }));
  },

  removePage: (pageId: number) => {
    set((state: any) => ({
      currentProject: state.currentProject
        ? {
            ...state.currentProject,
            pages: state.currentProject.pages.filter((p: any) => p.id !== pageId)
          }
        : null
    }));
  },

  updatePages: (pages: Page[]) => {
    set((state: any) => ({
      currentProject: state.currentProject
        ? { ...state.currentProject, pages }
        : null
    }));
  },

  setBlockSchemas: (schemas: BlockSchema[]) => {
    set({ blockSchemas: schemas });
  },

  setLoading: (loading: boolean) => {
    set({ loading });
  },

  setError: (error: string | null) => {
    set({ error });
  }
}));
