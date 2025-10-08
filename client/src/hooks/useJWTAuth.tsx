import type { ReactNode } from 'react';
import { createContext, useContext, useState, useEffect } from 'react';
import { apiRequest } from '@/lib/queryClient';

export interface User {
  id: string;
  username: string;
  email: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  lastLogin?: string;
}

interface AuthContextType {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  refreshAccessToken: () => Promise<boolean>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function JWTAuthProvider ({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize auth state from localStorage
  useEffect(() => {
    const initAuth = async () => {
      try {
        const storedAccessToken = localStorage.getItem('accessToken');
        const storedRefreshToken = localStorage.getItem('refreshToken');

        if (storedAccessToken && storedRefreshToken) {
          // Verify token and get user info
          const response = await apiRequest('GET', '/api/jwt/auth/me', {
            Authorization: `Bearer ${storedAccessToken}`,
          });

          if (response.ok) {
            const data = await response.json();
            setUser(data.user);
            setAccessToken(storedAccessToken);
            setRefreshToken(storedRefreshToken);
          } else {
            // Token is invalid, try to refresh
            const refreshed = await refreshAccessToken();
            if (!refreshed) {
              // Refresh failed, clear auth state
              clearAuthState();
            }
          }
        }
      } catch (error) {
        logger.error('Auth initialization error:', error);
        clearAuthState();
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, []);

  const clearAuthState = () => {
    setUser(null);
    setAccessToken(null);
    setRefreshToken(null);
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  };

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      setIsLoading(true);

      const response = await apiRequest('POST', '/api/auth/jwt/login', { email, password });

      if (response.ok) {
        const data = await response.json();

        setUser(data.user);
        setAccessToken(data.accessToken);
        setRefreshToken(data.refreshToken);

        // Store tokens in localStorage
        localStorage.setItem('accessToken', data.accessToken);
        localStorage.setItem('refreshToken', data.refreshToken);

        return { success: true };
      } else {
        const errorData = await response.json();
        return { success: false, error: errorData.error || 'Login failed' };
      }
    } catch (error) {
      logger.error('Login error:', error);
      return { success: false, error: 'Network error occurred' };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      if (accessToken) {
        // Call logout endpoint to blacklist token
        await apiRequest('POST', '/api/auth/jwt/logout', {
          Authorization: `Bearer ${accessToken}`,
        });
      }
    } catch (error) {
      logger.error('Logout error:', error);
    } finally {
      clearAuthState();
    }
  };

  const refreshAccessToken = async (): Promise<boolean> => {
    try {
      const storedRefreshToken = localStorage.getItem('refreshToken');
      if (!storedRefreshToken) {
        return false;
      }

      const response = await apiRequest('POST', '/api/auth/jwt/refresh', { refreshToken: storedRefreshToken });

      if (response.ok) {
        const data = await response.json();

        setAccessToken(data.accessToken);
        setRefreshToken(data.refreshToken);

        // Update localStorage
        localStorage.setItem('accessToken', data.accessToken);
        localStorage.setItem('refreshToken', data.refreshToken);

        return true;
      } else {
        return false;
      }
    } catch (error) {
      logger.error('Token refresh error:', error);
      return false;
    }
  };

  const value: AuthContextType = {
    user,
    accessToken,
    refreshToken,
    isLoading,
    login,
    logout,
    refreshAccessToken,
    isAuthenticated: !!user && !!accessToken,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useJWTAuth (): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useJWTAuth must be used within a JWTAuthProvider');
  }
  return context;
}

// Enhanced API request function with automatic token refresh
export async function authenticatedApiRequest (
  method: string,
  url: string,
  headers: Record<string, string> = {},
  body?: string,
): Promise<Response> {
  const accessToken = localStorage.getItem('accessToken');

  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  let response = await apiRequest(method, url, body, headers);

  // If token is expired (401), try to refresh
  if (response.status === 401 && accessToken) {
    const refreshToken = localStorage.getItem('refreshToken');
    if (refreshToken) {
      const refreshResponse = await apiRequest('POST', '/api/auth/jwt/refresh', { refreshToken });

      if (refreshResponse.ok) {
        const data = await refreshResponse.json();
        localStorage.setItem('accessToken', data.accessToken);
        localStorage.setItem('refreshToken', data.refreshToken);

        // Retry the original request with new token
        headers['Authorization'] = `Bearer ${data.accessToken}`;
        response = await apiRequest(method, url, body, headers);
      }
    }
  }

  return response;
}

