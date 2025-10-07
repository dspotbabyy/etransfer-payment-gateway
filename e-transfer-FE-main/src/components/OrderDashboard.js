import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Alert,
  CircularProgress
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  Visibility as VisibilityIcon,
  Edit as EditIcon,
  Delete as DeleteIcon
} from '@mui/icons-material';
import ConnectionStatus from './ConnectionStatus';
import OrderFilters from './OrderFilters';
import OrderDetailDialog from './OrderDetailDialog';
import EditOrderDialog from './EditOrderDialog';
import DeleteOrderDialog from './DeleteOrderDialog';
import { orderService } from '../services/orderService';

const OrderDashboard = () => {
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [detailOpen, setDetailOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState(null);

  // Get user info from localStorage
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const userEmail = user.email || '';
  const userRole = user.role || 'customer';

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      console.log('Fetching orders for userEmail:', userEmail);
      console.log('User object:', user);
      
      const response = await orderService.getAllOrders(userEmail);
      console.log('Order service response:', response);
      
      if (response.success && response.data) {
        // Sort orders by ID in descending order (newest first)
        const sortedOrders = response.data.sort((a, b) => b.id - a.id);
        console.log('Sorted orders:', sortedOrders);
        setOrders(sortedOrders);
      } else {
        console.error('Order service returned error:', response.message);
        setError(response.message || 'Failed to fetch orders');
        setOrders([]);
      }
    } catch (err) {
      console.error('Error fetching orders:', err);
      setError(err.message || 'Failed to fetch orders');
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, [userEmail]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Handle view order detail
  const handleViewDetail = (id) => {
    setSelectedOrderId(id);
    setDetailOpen(true);
  };

  // Handle close detail dialog
  const handleCloseDetail = () => {
    setDetailOpen(false);
    setSelectedOrderId(null);
  };

  // Handle edit order
  const handleEditOrder = (id) => {
    setSelectedOrderId(id);
    setEditOpen(true);
  };

  // Handle close edit dialog
  const handleCloseEdit = () => {
    setEditOpen(false);
    setSelectedOrderId(null);
  };

  // Handle delete order
  const handleDeleteOrder = (id) => {
    setSelectedOrderId(id);
    setDeleteOpen(true);
  };

  // Handle close delete dialog
  const handleCloseDelete = () => {
    setDeleteOpen(false);
    setSelectedOrderId(null);
  };

  // Handle successful operations
  const handleOperationSuccess = () => {
    fetchOrders(); // Refresh the orders list
  };

  // Handle filter changes
  const handleFilterChange = (filteredData) => {
    setFilteredOrders(filteredData);
  };

  // Handle summary changes
  const handleSummaryChange = (type, data) => {
    // Summary data is handled by OrderFilters component
    console.log('Summary changed:', type, data);
  };

  // Get current orders to display (filtered or all)
  const currentOrders = filteredOrders || orders;

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      {/* Page Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 'bold' }}>
            Order Management
          </Typography>
          <Typography variant="body1" color="textSecondary">
            Manage and monitor all transactions
          </Typography>
        </Box>
        <IconButton 
          onClick={fetchOrders} 
          color="primary" 
          title="Refresh"
          sx={{ 
            bgcolor: 'primary.main', 
            color: 'white',
            '&:hover': { bgcolor: 'primary.dark' }
          }}
        >
          <RefreshIcon />
        </IconButton>
      </Box>

      {/* Connection Status */}
      <ConnectionStatus />

      {/* Order Filters */}
      <OrderFilters
        userEmail={userEmail}
        userRole={userRole}
        onFilterChange={handleFilterChange}
        onSummaryChange={handleSummaryChange}
      />

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Statistics Cards */}
      <Grid container spacing={3} mb={3}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Total Transactions
              </Typography>
              <Typography variant="h4" component="div" sx={{ fontWeight: 'bold' }}>
                {Array.isArray(currentOrders) ? currentOrders.length : 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Total Value
              </Typography>
              <Typography variant="h4" component="div" sx={{ fontWeight: 'bold' }}>
                {Array.isArray(currentOrders) ? currentOrders.reduce((sum, order) => sum + (order.total || 0), 0) : 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Average/Transaction
              </Typography>
              <Typography variant="h4" component="div" sx={{ fontWeight: 'bold' }}>
                {Array.isArray(currentOrders) && currentOrders.length > 0 
                  ? (currentOrders.reduce((sum, order) => sum + (order.total || 0), 0) / currentOrders.length).toLocaleString('en-US') 
                  : '0'}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Orders Table */}
      <Card>
        <CardContent>
          <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2 }}>
            Recent Orders
          </Typography>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 'bold' }}>Woo Order ID</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Status</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Date</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Total</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Customer Name</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Customer Email</TableCell>
                  {userRole === 'admin' && (
                    <TableCell sx={{ fontWeight: 'bold' }}>Account</TableCell>
                  )}
                  <TableCell sx={{ fontWeight: 'bold' }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {!Array.isArray(currentOrders) || currentOrders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={userRole === 'admin' ? 8 : 7} align="center">
                      <Typography variant="body1" color="textSecondary">
                        {!Array.isArray(currentOrders) ? 'Loading data...' : 'No orders found'}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  currentOrders.map((order) => (
                    <TableRow key={order.id} hover>
                      <TableCell>{order.woo_order_id || 'N/A'}</TableCell>
                      <TableCell>
                        <Chip 
                          label={order.status || 'N/A'} 
                          color={order.status === 'paid' ? 'success' : order.status === 'pending' ? 'warning' : 'default'} 
                          size="small" 
                        />
                      </TableCell>
                      <TableCell>{order.date ? formatDate(order.date) : 'N/A'}</TableCell>
                      <TableCell>
                        <Chip
                          label={order.total ? order.total : '0'}
                          color="success"
                          variant="outlined"
                          size="small"
                        />
                      </TableCell>
                      <TableCell>{order.customer_name || 'N/A'}</TableCell>
                      <TableCell>{order.customer_email || 'N/A'}</TableCell>
                      {userRole === 'admin' && (
                        <TableCell>
                          {order.account_email ? (
                            <Typography variant="body2" color="textSecondary">
                              {order.account_username || order.account_email}
                            </Typography>
                          ) : (
                            'N/A'
                          )}
                        </TableCell>
                      )}
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 0.5 }}>
                          <IconButton
                            onClick={() => handleViewDetail(order.id)}
                            color="primary"
                            size="small"
                            title="View Details"
                          >
                            <VisibilityIcon />
                          </IconButton>
                          <IconButton
                            onClick={() => handleEditOrder(order.id)}
                            color="secondary"
                            size="small"
                            title="Edit Order"
                          >
                            <EditIcon />
                          </IconButton>
                          <IconButton
                            onClick={() => handleDeleteOrder(order.id)}
                            color="error"
                            size="small"
                            title="Delete Order"
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* Order Detail Dialog */}
      <OrderDetailDialog
        open={detailOpen}
        orderId={selectedOrderId}
        userEmail={userEmail}
        onClose={handleCloseDetail}
      />

      {/* Edit Order Dialog */}
      <EditOrderDialog
        open={editOpen}
        orderId={selectedOrderId}
        userEmail={userEmail}
        onClose={handleCloseEdit}
        onSuccess={handleOperationSuccess}
      />

      {/* Delete Order Dialog */}
      <DeleteOrderDialog
        open={deleteOpen}
        orderId={selectedOrderId}
        userEmail={userEmail}
        onClose={handleCloseDelete}
        onSuccess={handleOperationSuccess}
      />
    </Box>
  );
};

export default OrderDashboard; 