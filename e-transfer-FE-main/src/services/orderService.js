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

export const orderService = {
  // Get all orders for a user (alias for getMyOrders)
  getAllOrders: async (user_email) => {
    try {
      const result = await orderService.getMyOrders(user_email);
      return {
        success: true,
        data: result
      };
    } catch (error) {
      return {
        success: false,
        message: error.message || 'Failed to fetch orders',
        data: []
      };
    }
  },

  // Get orders for a specific user
  getMyOrders: async (user_email) => {
    try {
      console.log('getMyOrders called with user_email:', user_email);
      
      // First get user's ID from their account info
      const userResponse = await apiClient.get('/api/auth/accounts');
      console.log('Accounts API response:', userResponse.data);
      
      const accounts = Array.isArray(userResponse.data) ? userResponse.data : 
                      userResponse.data.data || userResponse.data.accounts || [];
      console.log('Parsed accounts:', accounts);
      
      const userAccount = accounts.find(account => account.email === user_email);
      console.log('Found user account:', userAccount);
      
      if (!userAccount || !userAccount.id) {
        console.warn('User account not found');
        return [];
      }

      // If user is admin, get all orders from all bank accounts
      if (userAccount.role === 'admin') {
        try {
          // First get all accounts to get their IDs
          const allAccounts = Array.isArray(userResponse.data) ? userResponse.data : 
                            userResponse.data.data || userResponse.data.accounts || [];
          
          // Fetch orders for each bank account
          const allOrders = [];
          for (const account of allAccounts) {
            try {
              const accountResponse = await apiClient.get('/api/orders', {
                params: { bank_account_id: account.id }
              });
              
              const accountData = accountResponse.data;
              let orders = [];
              if (Array.isArray(accountData)) {
                orders = accountData;
              } else if (accountData.data && Array.isArray(accountData.data)) {
                orders = accountData.data;
              } else if (accountData.orders && Array.isArray(accountData.orders)) {
                orders = accountData.orders;
              }
              
              // Add account info to each order
              orders.forEach(order => {
                order.account_email = account.email;
                order.account_username = account.username;
              });
              
              allOrders.push(...orders);
            } catch (error) {
              console.warn(`Failed to fetch orders for account ${account.id}:`, error);
            }
          }
          
          if (allOrders.length > 0) {
            return allOrders;
          }
        } catch (allOrdersError) {
          console.log('Failed to get all orders, falling back to user-specific orders');
        }
      }

      // Use user ID as bank_account_id
      const response = await apiClient.get('/api/orders', {
        params: { bank_account_id: userAccount.id }
      });
      
      // Ensure return array
      const data = response.data;
      if (Array.isArray(data)) {
        return data;
      } else if (data.data && Array.isArray(data.data)) {
        return data.data;
      } else if (data.orders && Array.isArray(data.orders)) {
        return data.orders;
      } else {
        console.warn('Unexpected API response structure:', data);
        return [];
      }
    } catch (error) {
      console.error('Error fetching my orders:', error);
      throw error;
    }
  },

  // Get order by ID
  getOrderById: async (id, user_email) => {
    try {
      const response = await apiClient.get(`/api/orders/${id}`, {
        params: { user_email }
      });
      
      const data = response.data;
      if (data.success !== undefined) {
        return data;
      } else {
        return {
          success: true,
          data: data
        };
      }
    } catch (error) {
      console.error('Error fetching order:', error);
      return {
        success: false,
        message: error.message || 'Failed to fetch order details',
        data: null
      };
    }
  },

  // Create new order
  createOrder: async (orderData) => {
    try {
      const response = await apiClient.post('/api/orders', orderData);
      return response.data;
    } catch (error) {
      console.error('Error creating order:', error);
      throw error;
    }
  },

  // Update order
  updateOrder: async (id, orderData, user_email) => {
    try {
      const response = await apiClient.put(`/api/orders/${id}`, orderData, {
        params: { user_email }
      });
      return response.data;
    } catch (error) {
      console.error('Error updating order:', error);
      throw error;
    }
  },

  // Delete order
  deleteOrder: async (id, user_email) => {
    try {
      const response = await apiClient.delete(`/api/orders/${id}`, {
        params: { user_email }
      });
      return response.data;
    } catch (error) {
      console.error('Error deleting order:', error);
      throw error;
    }
  },

  // Get all orders for admin users
  getAllOrdersForAdmin: async (user_email) => {
    try {
      const response = await apiClient.get('/api/orders/all', {
        params: { user_email }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching all orders:', error);
      throw error;
    }
  },

  // Filter orders by status
  filterOrdersByStatus: async (user_email, status) => {
    try {
      const response = await apiClient.get('/api/orders/filtered', {
        params: { user_email, status }
      });
      
      const data = response.data;
      if (data.success !== undefined) {
        return data;
      } else {
        return {
          success: true,
          data: Array.isArray(data) ? data : []
        };
      }
    } catch (error) {
      console.error('Error filtering orders by status:', error);
      return {
        success: false,
        message: error.message || 'Failed to filter orders',
        data: []
      };
    }
  },

  // Filter orders by date range
  filterOrdersByDateRange: async (user_email, start_date, end_date) => {
    try {
      const response = await apiClient.get('/api/orders/filtered', {
        params: { user_email, start_date, end_date }
      });
      
      const data = response.data;
      if (data.success !== undefined) {
        return data;
      } else {
        return {
          success: true,
          data: Array.isArray(data) ? data : []
        };
      }
    } catch (error) {
      console.error('Error filtering orders by date range:', error);
      return {
        success: false,
        message: error.message || 'Failed to filter orders',
        data: []
      };
    }
  },

  // Get summary by accounts (Admin)
  getSummaryByAccounts: async (user_email) => {
    try {
      const response = await apiClient.get('/api/orders/summary/accounts', {
        params: { user_email }
      });
      
      const data = response.data;
      if (data.success !== undefined) {
        return data;
      } else {
        return {
          success: true,
          data: data
        };
      }
    } catch (error) {
      console.error('Error fetching summary by accounts:', error);
      return {
        success: false,
        message: error.message || 'Failed to fetch summary',
        data: null
      };
    }
  },

  // Get summary by days
  getSummaryByDays: async (user_email, start_date = null, end_date = null) => {
    try {
      const params = { user_email };
      if (start_date) params.start_date = start_date;
      if (end_date) params.end_date = end_date;
      
      const response = await apiClient.get('/api/orders/summary/days', {
        params
      });
      
      const data = response.data;
      if (data.success !== undefined) {
        return data;
      } else {
        return {
          success: true,
          data: data
        };
      }
    } catch (error) {
      console.error('Error fetching summary by days:', error);
      return {
        success: false,
        message: error.message || 'Failed to fetch summary',
        data: null
      };
    }
  }
}; 