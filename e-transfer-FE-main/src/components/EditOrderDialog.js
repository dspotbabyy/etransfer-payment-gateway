import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
  Box,
  Typography
} from '@mui/material';
import {
  Edit as EditIcon,
  Save as SaveIcon,
  Cancel as CancelIcon
} from '@mui/icons-material';
import { orderService } from '../services/orderService';

const EditOrderDialog = ({ open, orderId, userEmail, onClose, onSuccess }) => {
  const [order, setOrder] = useState(null);
  const [formData, setFormData] = useState({
    woo_order_id: '',
    status: 'pending',
    total: '',
    customer_name: '',
    customer_email: '',
    customer_phone: '',
    shipping_address: '',
    billing_address: '',
    notes: ''
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

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
        const orderData = response.data;
        setOrder(orderData);
        setFormData({
          woo_order_id: orderData.woo_order_id || '',
          status: orderData.status || 'pending',
          total: orderData.total || '',
          customer_name: orderData.customer_name || '',
          customer_email: orderData.customer_email || '',
          customer_phone: orderData.customer_phone || '',
          shipping_address: orderData.shipping_address || '',
          billing_address: orderData.billing_address || '',
          notes: orderData.notes || ''
        });
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

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const validateForm = () => {
    if (!formData.woo_order_id.trim()) {
      setError('Woo Order ID is required');
      return false;
    }
    if (!formData.customer_name.trim()) {
      setError('Customer name is required');
      return false;
    }
    if (!formData.customer_email.trim()) {
      setError('Customer email is required');
      return false;
    }
    if (!formData.total || parseFloat(formData.total) <= 0) {
      setError('Total amount must be greater than 0');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      setSaving(true);
      setError('');
      setSuccess(false);

      const updateData = {
        ...formData,
        total: parseFloat(formData.total)
      };

      const response = await orderService.updateOrder(orderId, updateData, userEmail);
      
      if (response.success) {
        setSuccess(true);
        setTimeout(() => {
          if (onSuccess) onSuccess();
          handleClose();
        }, 1500);
      } else {
        setError(response.message || 'Failed to update order');
      }
    } catch (err) {
      console.error('Error updating order:', err);
      setError(err.message || 'Failed to update order');
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    setFormData({
      woo_order_id: '',
      status: 'pending',
      total: '',
      customer_name: '',
      customer_email: '',
      customer_phone: '',
      shipping_address: '',
      billing_address: '',
      notes: ''
    });
    setError('');
    setSuccess(false);
    setOrder(null);
    if (onClose) onClose();
  };

  return (
    <Dialog 
      open={open} 
      onClose={handleClose}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <EditIcon color="primary" />
          Edit Order
          {order && (
            <Typography variant="body2" color="textSecondary" sx={{ ml: 2 }}>
              ID: {order.id}
            </Typography>
          )}
        </Box>
      </DialogTitle>
      
      <DialogContent>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <Box component="form" onSubmit={handleSubmit} sx={{ pt: 2 }}>
            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}
            
            {success && (
              <Alert severity="success" sx={{ mb: 2 }}>
                Order updated successfully!
              </Alert>
            )}

            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Woo Order ID"
                  value={formData.woo_order_id}
                  onChange={(e) => handleInputChange('woo_order_id', e.target.value)}
                  required
                  margin="normal"
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth margin="normal" required>
                  <InputLabel>Status</InputLabel>
                  <Select
                    value={formData.status}
                    label="Status"
                    onChange={(e) => handleInputChange('status', e.target.value)}
                  >
                    <MenuItem value="pending">Pending</MenuItem>
                    <MenuItem value="processing">Processing</MenuItem>
                    <MenuItem value="completed">Completed</MenuItem>
                    <MenuItem value="cancelled">Cancelled</MenuItem>
                    <MenuItem value="refunded">Refunded</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Total Amount"
                  type="number"
                  value={formData.total}
                  onChange={(e) => handleInputChange('total', e.target.value)}
                  required
                  margin="normal"
                  inputProps={{ min: 0, step: 0.01 }}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Customer Name"
                  value={formData.customer_name}
                  onChange={(e) => handleInputChange('customer_name', e.target.value)}
                  required
                  margin="normal"
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Customer Email"
                  type="email"
                  value={formData.customer_email}
                  onChange={(e) => handleInputChange('customer_email', e.target.value)}
                  required
                  margin="normal"
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Customer Phone"
                  value={formData.customer_phone}
                  onChange={(e) => handleInputChange('customer_phone', e.target.value)}
                  margin="normal"
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Shipping Address"
                  multiline
                  rows={2}
                  value={formData.shipping_address}
                  onChange={(e) => handleInputChange('shipping_address', e.target.value)}
                  margin="normal"
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Billing Address"
                  multiline
                  rows={2}
                  value={formData.billing_address}
                  onChange={(e) => handleInputChange('billing_address', e.target.value)}
                  margin="normal"
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Notes"
                  multiline
                  rows={3}
                  value={formData.notes}
                  onChange={(e) => handleInputChange('notes', e.target.value)}
                  margin="normal"
                />
              </Grid>
            </Grid>
          </Box>
        )}
      </DialogContent>

      <DialogActions>
        <Button 
          onClick={handleClose} 
          disabled={saving}
          startIcon={<CancelIcon />}
        >
          Cancel
        </Button>
        <Button 
          onClick={handleSubmit}
          variant="contained" 
          disabled={saving || loading}
          startIcon={saving ? <CircularProgress size={16} /> : <SaveIcon />}
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default EditOrderDialog; 