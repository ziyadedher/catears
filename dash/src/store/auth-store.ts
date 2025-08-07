import { create } from 'zustand';

interface AuthStore {
  isAuthenticated: boolean;
  username: string | null;
  isLoading: boolean;
  error: string | null;
  
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  verifySession: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  isAuthenticated: false,
  username: null,
  isLoading: false,
  error: null,
  
  login: async (username: string, password: string) => {
    set({ isLoading: true, error: null });
    
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        set({ 
          isLoading: false, 
          error: data.error || 'Login failed',
          isAuthenticated: false,
        });
        return false;
      }
      
      set({
        isAuthenticated: true,
        username: data.username,
        isLoading: false,
        error: null,
      });
      
      return true;
    } catch {
      set({
        isLoading: false,
        error: 'Network error. Please try again.',
        isAuthenticated: false,
      });
      return false;
    }
  },
  
  logout: async () => {
    set({ isLoading: true });
    
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
      });
    } catch (error) {
      console.error('Logout error:', error);
    }
    
    set({
      isAuthenticated: false,
      username: null,
      isLoading: false,
      error: null,
    });
  },
  
  verifySession: async () => {
    set({ isLoading: true });
    
    try {
      const response = await fetch('/api/auth/verify');
      const data = await response.json();
      
      if (data.authenticated) {
        set({
          isAuthenticated: true,
          username: data.username,
          isLoading: false,
        });
      } else {
        set({
          isAuthenticated: false,
          username: null,
          isLoading: false,
        });
      }
    } catch {
      set({
        isAuthenticated: false,
        username: null,
        isLoading: false,
      });
    }
  },
  
  clearError: () => set({ error: null }),
}));