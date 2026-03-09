import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { Project, Page, BlockSchema } from '../types';
import apiService from '../services/api';

interface ProjectStore {
  projects: Project[];
  currentProject: Project | null;
  currentPage: Page | null;
  blockSchemas: BlockSchema[];
  loading: boolean;
  error: string | null;

  // Actions
  fetchProjects: () => Promise<void>;
  fetchProject: (projectId: number) => Promise<void>;
  createProject: (name: string, description?: string, type?: number) => Promise<Project | null>;
  updateProject: (projectId: number, data: Partial<Project>) => Promise<void>;
  deleteProject: (projectId: number) => Promise<void>;
  setCurrentProject: (project: Project | null) => void;
  setCurrentPage: (page: Page | null) => void;
  addPage: (page: Page) => void;
  removePage: (pageId: number) => void;
  updatePages: (pages: Page[]) => void;
  setBlockSchemas: (schemas: BlockSchema[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useProjectStore = create<ProjectStore>()(
  devtools(
    (set) => ({
      projects: [],
      currentProject: null,
      currentPage: null,
      blockSchemas: [],
      loading: false,
      error: null,

      fetchProjects: async () => {
        set({ loading: true, error: null });
        try {
          const projects = await apiService.getProjects();
          set({ projects, loading: false });
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
          const currentProject = await apiService.getProject(projectId);
          set({ currentProject, loading: false });
        } catch (err: any) {
          set({ 
            error: err.message || 'Failed to fetch project',
            loading: false 
          });
        }
      },

      createProject: async (name: string, description?: string, type?: number) => {
        set({ loading: true, error: null });
        try {
          const newProject = await apiService.createProject(name, description || '', type || 0);
          set((state) => ({
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

      updateProject: async (projectId: number, data: Partial<Project>) => {
        set({ loading: true, error: null });
        try {
          await apiService.updateProject(projectId, data);
          set((state) => ({
            projects: state.projects.map((p) => 
              p.id === projectId ? { ...p, ...data } : p
            ),
            currentProject: state.currentProject?.id === projectId 
              ? { ...state.currentProject, ...data }
              : state.currentProject,
            loading: false
          }));
          apiService.clearCache(`project-${projectId}`);
        } catch (err: any) {
          set({ 
            error: err.message || 'Failed to update project',
            loading: false 
          });
        }
      },

      deleteProject: async (projectId: number) => {
        set({ loading: true, error: null });
        try {
          await apiService.deleteProject(projectId);
          set((state) => ({
            projects: state.projects.filter((p) => p.id !== projectId),
            currentProject: state.currentProject?.id === projectId ? null : state.currentProject,
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
        set((state) => ({
          currentProject: state.currentProject 
            ? { ...state.currentProject, pages: [...(state.currentProject.pages || []), page] }
            : null
        }));
      },

      removePage: (pageId: number) => {
        set((state) => ({
          currentProject: state.currentProject
            ? {
                ...state.currentProject,
                pages: (state.currentProject.pages || []).filter((p) => p.id !== pageId)
              }
            : null
        }));
      },

      updatePages: (pages: Page[]) => {
        set((state) => ({
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
    }),
    { name: 'ProjectStore', trace: true }
  )
);

