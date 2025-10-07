import axios from 'axios';

// Create axios instance with default configuration
const api = axios.create({
  baseURL: 'https://e-transfer-be.onrender.com',
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Interceptor to add token to headers
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Interceptor to handle responses
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Only reload page if user is logged in (has token)
      const token = localStorage.getItem('token');
      if (token) {
        localStorage.clear();
        window.location.reload();
      }
      // If no token (on login page), don't reload
    }
    return Promise.reject(error);
  }
);

export const authService = {
  // Login
  login: async (credentials) => {
    try {
      // Use email directly from credentials
      const loginData = {
        email: credentials.email,
        password: credentials.password
      };
      
      const response = await api.post('/api/auth/login', loginData);
      
      if (response.data.success) {
        // API returns success: true and data contains user info
        localStorage.setItem('isLoggedIn', 'true');
        localStorage.setItem('user', JSON.stringify(response.data.data));
        // Create a fake token or use user ID as token
        localStorage.setItem('token', `fake_token_${response.data.data.id}`);
        return response.data;
      } else {
        // API returns success: false with error message
        throw new Error(response.data.message);
      }
    } catch (error) {
      if (error.code === 'ERR_NETWORK') {
        throw new Error('Network Error: Cannot connect to server. Please check your network connection.');
      }
      
      // Handle specific error types
      if (error.response?.data?.message) {
                  // Use message from API if available
        throw new Error(error.response.data.message);
      } else if (error.response?.status === 401) {
        throw new Error('Email or password is incorrect. Please check your login information.');
      } else if (error.response?.status === 400) {
        throw new Error('Invalid login information. Please check your email format.');
      } else if (error.response?.status === 404) {
        throw new Error('Account does not exist. Please check your email.');
      } else {
        throw new Error('Login failed. Please try again later.');
      }
    }
  },

  // Logout user
  logout: async () => {
    try {
      await api.post('/api/auth/logout');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('token');
      localStorage.removeItem('isLoggedIn');
      localStorage.removeItem('user');
    }
  },

  // Get current user information
  getCurrentUser: async () => {
    try {
      const response = await api.get('/api/auth/me');
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to get user info' };
    }
  },

  // Change password
  changePassword: async (passwordData) => {
    try {
      const response = await api.post('/api/auth/change-password', passwordData);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to change password' };
    }
  },

  // Register new account
  register: async (userData) => {
    try {
      const response = await api.post('/api/auth/register', userData);
      return response.data;
    } catch (error) {
      if (error.code === 'ERR_NETWORK') {
        throw new Error('Network Error: Cannot connect to server. Please check your network connection.');
      }
      
      if (error.response?.data?.message) {
        throw new Error(error.response.data.message);
      } else if (error.response?.status === 400) {
        throw new Error('Invalid registration data. Please check your information.');
      } else if (error.response?.status === 409) {
        throw new Error('Email or username already exists. Please use different credentials.');
      } else {
        throw new Error('Registration failed. Please try again later.');
      }
    }
  },
};

export const accountService = {
  // Get all accounts list
  getAllAccounts: async () => {
    try {
      const response = await api.get('/api/auth/accounts');
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to fetch accounts' };
    }
  },

  // Get account information by ID
  getAccountById: async (id) => {
    try {
      const response = await api.get(`/api/auth/accounts/${id}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to fetch account' };
    }
  },

  // Create new account
  createAccount: async (accountData) => {
    try {
      const response = await api.post('/api/auth/accounts', accountData);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to create account' };
    }
  },

  // Update account
  updateAccount: async (id, accountData) => {
    try {
      const response = await api.put(`/api/auth/accounts/${id}`, accountData);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to update account' };
    }
  },

  // Delete account
  deleteAccount: async (id) => {
    try {
      const response = await api.delete(`/api/auth/accounts/${id}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to delete account' };
    }
  },

  // Activate/deactivate account
  toggleAccountStatus: async (id) => {
    try {
      const response = await api.patch(`/api/auth/accounts/${id}/toggle-status`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to toggle account status' };
    }
  },
};

export default api; 