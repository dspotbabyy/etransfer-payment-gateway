import axios from 'axios';

const API_BASE_URL = 'https://e-transfer-be.onrender.com';

// Create axios instance with default configuration
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor to add token to header
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor to handle response
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Only reload page if user is logged in (has token)
      const token = localStorage.getItem('token');
      if (token) {
        localStorage.removeItem('token');
        localStorage.removeItem('isLoggedIn');
        localStorage.removeItem('user');
        window.location.reload();
      }
      // If no token (on login page), don't reload
    }
    return Promise.reject(error);
  }
);

export const userService = {
  // Get all users
  getAllUsers: async () => {
    try {
      const response = await apiClient.get('/api/users');
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to fetch users' };
    }
  },

  // Get user by ID
  getUserById: async (id) => {
    try {
      const response = await apiClient.get(`/api/users/${id}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to fetch user' };
    }
  },

  // Create new user
  createUser: async (userData) => {
    try {
      const response = await apiClient.post('/api/users', userData);
      return response.data;
    } catch (error) {
      if (error.code === 'ERR_NETWORK') {
        throw new Error('Network Error: Cannot connect to server. Please check your network connection.');
      }
      
      if (error.response?.data?.message) {
        throw new Error(error.response.data.message);
      } else if (error.response?.status === 400) {
        throw new Error('Invalid user data. Please check your information.');
      } else if (error.response?.status === 409) {
        throw new Error('Email or username already exists. Please use different credentials.');
      } else {
        throw new Error('User creation failed. Please try again later.');
      }
    }
  },

  // Update user
  updateUser: async (id, userData) => {
    try {
      const response = await apiClient.put(`/api/users/${id}`, userData);
      return response.data;
    } catch (error) {
      if (error.code === 'ERR_NETWORK') {
        throw new Error('Network Error: Cannot connect to server. Please check your network connection.');
      }
      
      if (error.response?.data?.message) {
        throw new Error(error.response.data.message);
      } else if (error.response?.status === 400) {
        throw new Error('Invalid user data. Please check your information.');
      } else if (error.response?.status === 404) {
        throw new Error('User not found.');
      } else {
        throw new Error('User update failed. Please try again later.');
      }
    }
  },

  // Delete user
  deleteUser: async (id) => {
    try {
      const response = await apiClient.delete(`/api/users/${id}`);
      return response.data;
    } catch (error) {
      if (error.code === 'ERR_NETWORK') {
        throw new Error('Network Error: Cannot connect to server. Please check your network connection.');
      }
      
      if (error.response?.data?.message) {
        throw new Error(error.response.data.message);
      } else if (error.response?.status === 404) {
        throw new Error('User not found.');
      } else if (error.response?.status === 403) {
        throw new Error('You do not have permission to delete this user.');
      } else {
        throw new Error('User deletion failed. Please try again later.');
      }
    }
  },

  // Toggle user status (activate/deactivate)
  toggleUserStatus: async (id) => {
    try {
      const response = await apiClient.patch(`/api/users/${id}/toggle-status`);
      return response.data;
    } catch (error) {
      if (error.code === 'ERR_NETWORK') {
        throw new Error('Network Error: Cannot connect to server. Please check your network connection.');
      }
      
      if (error.response?.data?.message) {
        throw new Error(error.response.data.message);
      } else if (error.response?.status === 404) {
        throw new Error('User not found.');
      } else {
        throw new Error('Status toggle failed. Please try again later.');
      }
    }
  },

  // Change user role
  changeUserRole: async (id, role) => {
    try {
      const response = await apiClient.patch(`/api/users/${id}/role`, { role });
      return response.data;
    } catch (error) {
      if (error.code === 'ERR_NETWORK') {
        throw new Error('Network Error: Cannot connect to server. Please check your network connection.');
      }
      
      if (error.response?.data?.message) {
        throw new Error(error.response.data.message);
      } else if (error.response?.status === 404) {
        throw new Error('User not found.');
      } else if (error.response?.status === 403) {
        throw new Error('You do not have permission to change user roles.');
      } else {
        throw new Error('Role change failed. Please try again later.');
      }
    }
  },

  // Get user statistics
  getUserStats: async () => {
    try {
      const response = await apiClient.get('/api/users/stats');
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to fetch user statistics' };
    }
  },

  // Search users
  searchUsers: async (query) => {
    try {
      const response = await apiClient.get(`/api/users/search?q=${encodeURIComponent(query)}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to search users' };
    }
  },

  // Get users by role
  getUsersByRole: async (role) => {
    try {
      const response = await apiClient.get(`/api/users/role/${role}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to fetch users by role' };
    }
  }
}; 