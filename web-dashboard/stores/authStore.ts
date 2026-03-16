import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User, UserRole } from '@/types';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  role: UserRole;
  isAuthenticated: boolean;

  // Actions
  login: (accessToken: string, refreshToken: string, user: User) => void;
  logout: () => void;
  updateUser: (user: Partial<User>) => void;
  switchRole: () => void;
  setRole: (role: UserRole) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      role: 'traveler',
      isAuthenticated: false,

      login: (accessToken: string, refreshToken: string, user: User) => {
        // Store tokens in localStorage for API interceptor
        if (typeof window !== 'undefined') {
          localStorage.setItem('access_token', accessToken);
          localStorage.setItem('refresh_token', refreshToken);
        }

        set({
          accessToken,
          refreshToken,
          user,
          isAuthenticated: true,
        });
      },

      logout: () => {
        // Clear tokens from localStorage
        if (typeof window !== 'undefined') {
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
        }

        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
          role: 'traveler',
        });
      },

      updateUser: (userData: Partial<User>) => {
        const currentUser = get().user;
        if (currentUser) {
          set({
            user: { ...currentUser, ...userData },
          });
        }
      },

      switchRole: () => {
        const currentRole = get().role;
        set({
          role: currentRole === 'traveler' ? 'sender' : 'traveler',
        });
      },

      setRole: (role: UserRole) => {
        set({ role });
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        role: state.role,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state) => {
        // Sync localStorage tokens with store after rehydration
        if (state && typeof window !== 'undefined') {
          const storedAccessToken = localStorage.getItem('access_token');
          const storedRefreshToken = localStorage.getItem('refresh_token');

          // If tokens exist in localStorage but not in store, update store
          if (storedAccessToken && !state.accessToken) {
            state.accessToken = storedAccessToken;
            state.refreshToken = storedRefreshToken;
            state.isAuthenticated = true;
          }

          // If tokens exist in store but not in localStorage, update localStorage
          if (state.accessToken && !storedAccessToken) {
            localStorage.setItem('access_token', state.accessToken);
            if (state.refreshToken) {
              localStorage.setItem('refresh_token', state.refreshToken);
            }
          }
        }
      },
    }
  )
);
