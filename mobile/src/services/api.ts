import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User, Account, Transaction, DashboardData, AIResponse } from '../types';

const API_BASE_URL = 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
});

// Request interceptor to add auth token
api.interceptors.request.use(
  async (config) => {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.error('Error getting auth token:', error);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Token expired, clear storage and redirect to login
      await AsyncStorage.multiRemove(['auth_token', 'user_data']);
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  login: async (email: string, password: string): Promise<{ user: User; token: string }> => {
    const response = await api.post('/auth/login', { email, password });
    return response.data;
  },

  register: async (email: string, password: string, name: string): Promise<{ user: User; token: string }> => {
    const response = await api.post('/auth/register', { email, password, name });
    return response.data;
  },

  getMe: async (): Promise<{ user: User }> => {
    const response = await api.get('/auth/me');
    return response.data;
  },

  logout: async (): Promise<void> => {
    await api.post('/auth/logout');
    await AsyncStorage.multiRemove(['auth_token', 'user_data']);
  }
};

export const accountsAPI = {
  getAccounts: async (): Promise<Account[]> => {
    const response = await api.get('/accounts');
    return response.data;
  },

  getAccountById: async (id: string): Promise<Account> => {
    const response = await api.get(`/accounts/${id}`);
    return response.data;
  }
};

export const transactionsAPI = {
  getTransactions: async (): Promise<{ transactions: Transaction[]; total: number }> => {
    const response = await api.get('/transactions');
    return response.data;
  },

  createTransaction: async (transactionData: Partial<Transaction>): Promise<Transaction> => {
    const response = await api.post('/transactions', transactionData);
    return response.data;
  },

  transferFunds: async (fromAccountId: string, toAccountId: string, amount: number, description: string): Promise<any> => {
    const response = await api.post('/virman', {
      fromAccountId,
      toAccountId,
      amount,
      description
    });
    return response.data;
  }
};

export const dashboardAPI = {
  getDashboardData: async (): Promise<DashboardData> => {
    const response = await api.get('/dashboard');
    return response.data;
  }
};

export const aiAPI = {
  generateResponse: async (query: string, persona?: string): Promise<AIResponse> => {
    const response = await api.post('/ai/generate', { query, persona });
    return response.data;
  }
};

export default api;
