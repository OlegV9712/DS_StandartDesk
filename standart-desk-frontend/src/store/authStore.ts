import { create } from 'zustand';

export interface AuthUser {
  id: number;
  username: string;
  email: string;
  fullName?: string;
  avatar?: string;
  role: 'Admin' | 'Manager' | 'User' | 'Guest';
  token: string;
  isActive?: boolean;
  createdAt?: string;
  lastLoginAt?: string;
}

export interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  login: (user: AuthUser) => void;
  logout: () => void;
  updateUser: (user: Partial<AuthUser>) => void;
}

export const useAuth = create<AuthState>((set) => ({
  user: localStorage.getItem('authUser') ? JSON.parse(localStorage.getItem('authUser') || '') : null,
  isAuthenticated: !!localStorage.getItem('authToken'),

  login: (user: AuthUser) => {
    localStorage.setItem('authUser', JSON.stringify(user));
    localStorage.setItem('authToken', user.token);
    set({
      user,
      isAuthenticated: true
    });
  },

  logout: () => {
    localStorage.removeItem('authUser');
    localStorage.removeItem('authToken');
    set({
      user: null,
      isAuthenticated: false
    });
  },

  updateUser: (userData: Partial<AuthUser>) => {
    set((state: any) => ({
      user: state.user ? { ...state.user, ...userData } : null
    }));
  }
}));
