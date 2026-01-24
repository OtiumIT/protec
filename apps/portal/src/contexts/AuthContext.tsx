import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authService, LoginData, RegisterData } from '../services/auth.service';

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  company_id: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  tenantId: string | null;
  login: (data: LoginData) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Carregar dados do localStorage
    const storedToken = localStorage.getItem('accessToken');
    const storedRefreshToken = localStorage.getItem('refreshToken');
    const storedUser = localStorage.getItem('user');
    const storedTenantId = localStorage.getItem('tenantId');

    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
      setTenantId(storedTenantId);
    }

    setIsLoading(false);
  }, []);

  const login = async (data: LoginData) => {
    const response = await authService.login(data);
    const { user, tokens } = response.data;

    setUser(user);
    setToken(tokens.access);
    setTenantId(user.company_id);

    localStorage.setItem('accessToken', tokens.access);
    localStorage.setItem('refreshToken', tokens.refresh);
    localStorage.setItem('user', JSON.stringify(user));
    localStorage.setItem('tenantId', user.company_id);
  };

  const register = async (data: RegisterData) => {
    const response = await authService.register(data);
    const { user, tokens } = response.data;

    setUser(user);
    setToken(tokens.access);
    setTenantId(user.company_id);

    localStorage.setItem('accessToken', tokens.access);
    localStorage.setItem('refreshToken', tokens.refresh);
    localStorage.setItem('user', JSON.stringify(user));
    localStorage.setItem('tenantId', user.company_id);
  };

  const logout = () => {
    const refreshToken = localStorage.getItem('refreshToken');
    if (refreshToken && token && tenantId) {
      authService.logout(refreshToken, token, tenantId).catch(console.error);
    }

    setUser(null);
    setToken(null);
    setTenantId(null);

    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    localStorage.removeItem('tenantId');
  };

  return (
    <AuthContext.Provider value={{ user, token, tenantId, login, register, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
