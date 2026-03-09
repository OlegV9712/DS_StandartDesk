import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

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
  hydrate: () => void;
}

export const useAuth = create<AuthState>()(
  devtools(
    (set) => ({
      user: null,
      isAuthenticated: false,

      // Initialize from localStorage
      hydrate: () => {
        try {
          const authUser = localStorage.getItem('authUser');
          const authToken = localStorage.getItem('authToken');
          
          if (authUser && authToken) {
            const user = JSON.parse(authUser);
            set({
              user,
              isAuthenticated: true
            });
          }
        } catch (error) {
          console.error('Failed to hydrate auth store:', error);
        }
      },

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
        // Dispatch logout event for cleanup
        window.dispatchEvent(new CustomEvent('logout'));
      },

      updateUser: (userData: Partial<AuthUser>) => {
        set((state) => {
          if (!state.user) return { user: null };
          const updatedUser = { ...state.user, ...userData };
          localStorage.setItem('authUser', JSON.stringify(updatedUser));
          return { user: updatedUser };
        });
      }
    }),
    { name: 'AuthStore', trace: true }
  )
);

// Initialize auth store on app start
useAuth.getState().hydrate();

