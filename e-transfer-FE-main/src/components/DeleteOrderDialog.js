import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Alert,
  CircularProgress,
  Box,
  Typography,
  Divider
} from '@mui/material';
import {
  Delete as DeleteIcon,
  Warning as WarningIcon,
  Cancel as CancelIcon
} from '@mui/icons-material';
import { orderService } from '../services/orderService';

const DeleteOrderDialog = ({ open, orderId, userEmail, onClose, onSuccess }) => {
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open && orderId) {
      fetchOrderDetails();
    }
  }, [open, orderId]);

  const fetchOrderDetails = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await orderService.getOrderById(orderId, userEmail);
      
      if (response.success && response.data) {
        setOrder(response.data);
      } else {
        setError(response.message || 'Failed to fetch order details');
      }
    } catch (err) {
      console.error('Error fetching order details:', err);
      setError(err.message || 'Failed to fetch order details');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      setDeleting(true);
      setError('');

      const response = await orderService.deleteOrder(orderId, userEmail);
      
      if (response.success) {
        // Success - close dialog and refresh
        if (onSuccess) onSuccess();
        handleClose();
      } else {
        setError(response.message || 'Failed to delete order');
      }
    } catch (err) {
      console.error('Error deleting order:', err);
      setError(err.message || 'Failed to delete order');
    } finally {
      setDeleting(false);
    }
  };

  const handleClose = () => {
    setOrder(null);
    setError('');
    if (onClose) onClose();
  };

  return (
    <Dialog 
      open={open} 
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <DeleteIcon color="error" />
          Delete Order
        </Box>
      </DialogTitle>
      
      <DialogContent>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <Box sx={{ pt: 1 }}>
            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}

            <Alert severity="warning" sx={{ mb: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <WarningIcon />
                <Typography variant="body2">
                  <strong>Warning:</strong> This action cannot be undone. The order will be permanently deleted.
                </Typography>
              </Box>
            </Alert>

            {order && (
              <Box sx={{ bgcolor: 'grey.50', p: 2, borderRadius: 1, mb: 2 }}>
                <Typography variant="h6" gutterBottom>
                  Order Details
                </Typography>
                <Divider sx={{ mb: 2 }} />
                
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                  <Box>
                    <Typography variant="body2" color="textSecondary">
                      Order ID
                    </Typography>
                    <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
                      {order.id}
                    </Typography>
                  </Box>
                  
                  <Box>
                    <Typography variant="body2" color="textSecondary">
                      Woo Order ID
                    </Typography>
                    <Typography variant="body1">
                      {order.woo_order_id || 'N/A'}
                    </Typography>
                  </Box>
                  
                  <Box>
                    <Typography variant="body2" color="textSecondary">
                      Customer Name
                    </Typography>
                    <Typography variant="body1">
                      {order.customer_name || 'N/A'}
                    </Typography>
                  </Box>
                  
                  <Box>
                    <Typography variant="body2" color="textSecondary">
                      Total Amount
                    </Typography>
                    <Typography variant="body1" sx={{ fontWeight: 'bold', color: 'success.main' }}>
                      {order.total || '0'}
                    </Typography>
                  </Box>
                  
                  <Box>
                    <Typography variant="body2" color="textSecondary">
                      Status
                    </Typography>
                    <Typography variant="body1">
                      {order.status || 'N/A'}
                    </Typography>
                  </Box>
                  
                  <Box>
                    <Typography variant="body2" color="textSecondary">
                      Date
                    </Typography>
                    <Typography variant="body1">
                      {order.date ? new Date(order.date).toLocaleDateString() : 'N/A'}
                    </Typography>
                  </Box>
                </Box>
              </Box>
            )}

            <Typography variant="body1" color="textSecondary">
              Are you sure you want to delete this order? This action cannot be undone.
            </Typography>
          </Box>
        )}
      </DialogContent>

      <DialogActions>
        <Button 
          onClick={handleClose} 
          disabled={deleting}
          startIcon={<CancelIcon />}
        >
          Cancel
        </Button>
        <Button 
          onClick={handleDelete}
          variant="contained" 
          color="error"
          disabled={deleting || loading}
          startIcon={deleting ? <CircularProgress size={16} /> : <DeleteIcon />}
        >
          {deleting ? 'Deleting...' : 'Delete Order'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default DeleteOrderDialog; 