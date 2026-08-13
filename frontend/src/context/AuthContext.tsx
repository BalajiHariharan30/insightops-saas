import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import api from '../utils/api';
import type { User } from '../types';

interface AuthContextValue {
  user: User | null;
  isAuthChecked: boolean;   // true once the initial /auth/me call has resolved
  isAuthenticated: boolean;
  setUser: (u: User | null) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthChecked, setIsAuthChecked] = useState(false);

  // Run once on app boot — verify the stored token is still valid
  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      // No token at all — skip the network call, just mark checked
      setIsAuthChecked(true);
      return;
    }

    api
      .get('/auth/me')
      .then((res) => setUser(res.data.data))
      .catch(() => {
        // Token invalid or expired; the axios interceptor will already
        // attempt a refresh. If that also fails, it clears localStorage.
        setUser(null);
      })
      .finally(() => setIsAuthChecked(true));
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('active_organization_id');
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthChecked,
        isAuthenticated: !!user,
        setUser,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextValue => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
};
