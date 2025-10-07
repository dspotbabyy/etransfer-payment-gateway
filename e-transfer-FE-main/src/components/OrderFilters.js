import React, { useState } from 'react';
import {
  Paper,
  Box,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Button,
  Typography,
  Chip,
  Card,
  CardContent,
  Alert,
  IconButton,
  Tooltip,
  Fade,
  Slide,
  Collapse
} from '@mui/material';
import {
  FilterList as FilterIcon,
  Refresh as RefreshIcon,
  TrendingUp as TrendingUpIcon,
  AccountBalance as AccountBalanceIcon,
  CalendarToday as CalendarIcon,
  Analytics as AnalyticsIcon,
  Clear as ClearIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon
} from '@mui/icons-material';
import { orderService } from '../services/orderService';

const OrderFilters = ({ userEmail, onFilterChange, onSummaryChange, userRole }) => {
  const [filters, setFilters] = useState({
    status: '',
    startDate: '',
    endDate: ''
  });
  const [summary, setSummary] = useState({
    accounts: null,
    days: null,
    loading: false
  });
  const [error, setError] = useState('');
  const [showAnalytics, setShowAnalytics] = useState(false);

  const statusOptions = [
    { value: '', label: 'All Status', color: 'default' },
    { value: 'pending', label: 'Pending', color: 'warning' },
    { value: 'completed', label: 'Completed', color: 'success' },
    { value: 'processing', label: 'Processing', color: 'info' },
    { value: 'cancelled', label: 'Cancelled', color: 'error' }
  ];

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };

  const applyStatusFilter = async () => {
    try {
      setError('');
      const response = await orderService.filterOrdersByStatus(userEmail, filters.status);
      if (response.success && response.data) {
        onFilterChange(response.data);
      } else {
        setError('Failed to filter orders by status');
      }
    } catch (err) {
      setError('Error applying status filter');
    }
  };

  const applyDateFilter = async () => {
    try {
      setError('');
      if (!filters.startDate || !filters.endDate) {
        setError('Please select both start and end dates');
        return;
      }
      
      const response = await orderService.filterOrdersByDateRange(
        userEmail, 
        filters.startDate, 
        filters.endDate
      );
      if (response.success && response.data) {
        onFilterChange(response.data);
      } else {
        setError('Failed to filter orders by date range');
      }
    } catch (err) {
      setError('Error applying date filter');
    }
  };

  const loadSummaryByAccounts = async () => {
    try {
      setError('');
      setSummary(prev => ({ ...prev, loading: true }));
      const response = await orderService.getSummaryByAccounts(userEmail);
      if (response.success && response.data) {
        setSummary(prev => ({ ...prev, accounts: response.data, loading: false }));
        onSummaryChange('accounts', response.data);
        setShowAnalytics(true);
      } else {
        setError('Failed to load accounts summary');
        setSummary(prev => ({ ...prev, loading: false }));
      }
    } catch (err) {
      setError('Error loading accounts summary');
      setSummary(prev => ({ ...prev, loading: false }));
    }
  };

  const loadSummaryByDays = async () => {
    try {
      setError('');
      setSummary(prev => ({ ...prev, loading: true }));
      const response = await orderService.getSummaryByDays(
        userEmail, 
        filters.startDate || null, 
        filters.endDate || null
      );
      if (response.success && response.data) {
        setSummary(prev => ({ ...prev, days: response.data, loading: false }));
        onSummaryChange('days', response.data);
        setShowAnalytics(true);
      } else {
        setError('Failed to load days summary');
        setSummary(prev => ({ ...prev, loading: false }));
      }
    } catch (err) {
      setError('Error loading days summary');
      setSummary(prev => ({ ...prev, loading: false }));
    }
  };

  const resetFilters = () => {
    setFilters({ status: '', startDate: '', endDate: '' });
    setSummary({ accounts: null, days: null, loading: false });
    setError('');
    setShowAnalytics(false);
    onFilterChange(null);
    onSummaryChange(null, null);
  };

  const hasActiveFilters = filters.status || filters.startDate || filters.endDate;

  return (
    <Fade in timeout={800}>
      <Paper 
        elevation={3}
        sx={{ 
          p: 4, 
          mb: 3, 
          borderRadius: 3,
          background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
          border: '1px solid rgba(255,255,255,0.2)'
        }}
      >
        {/* Header */}
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={4}>
          <Box display="flex" alignItems="center" gap={1}>
            <Box
              sx={{
                p: 0.75,
                borderRadius: 1.5,
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                height: 32,
                width: 32
              }}
            >
              <FilterIcon sx={{ fontSize: 18 }} />
            </Box>
            <Box>
              <Typography variant="subtitle1" fontWeight={600} color="text.primary" sx={{ lineHeight: 1.2 }}>
                Order Filters & Analytics
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1 }}>
                Filter orders and view detailed analytics
              </Typography>
            </Box>
          </Box>
          
          <Box display="flex" gap={0.5}>
            <Tooltip title="Toggle Analytics">
              <IconButton
                onClick={() => setShowAnalytics(!showAnalytics)}
                sx={{
                  background: 'rgba(255,255,255,0.1)',
                  '&:hover': { background: 'rgba(255,255,255,0.2)' }
                }}
              >
                {showAnalytics ? <ExpandLessIcon /> : <ExpandMoreIcon />}
              </IconButton>
            </Tooltip>
            <Tooltip title="Reset All Filters">
              <IconButton
                onClick={resetFilters}
                disabled={!hasActiveFilters && !summary.accounts && !summary.days}
                sx={{
                  background: 'rgba(255,255,255,0.1)',
                  '&:hover': { background: 'rgba(255,255,255,0.2)' }
                }}
              >
                <ClearIcon />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        {error && (
          <Slide direction="down" in={!!error}>
            <Alert 
              severity="error" 
              sx={{ 
                mb: 3, 
                borderRadius: 2,
                '& .MuiAlert-icon': { fontSize: 24 }
              }}
              onClose={() => setError('')}
            >
              {error}
            </Alert>
          </Slide>
        )}

        {/* Filter Controls */}
        <Card elevation={2} sx={{ borderRadius: 3, mb: 3 }}>
          <CardContent sx={{ p: 2 }}>
            <Typography variant="subtitle1" fontWeight={600} mb={2} color="primary">
              Quick Filters
            </Typography>
            
            <Grid container spacing={3}>
              {/* Status Filter */}
              <Grid item xs={12} sm={6} md={3}>
                <FormControl fullWidth>
                  <InputLabel sx={{ fontWeight: 500 }}>Status Filter</InputLabel>
                  <Select
                    value={filters.status}
                    label="Status Filter"
                    onChange={(e) => handleFilterChange('status', e.target.value)}
                    sx={{
                      minWidth: 180, // Increase width for status select
                      '& .MuiOutlinedInput-root': {
                        borderRadius: 2,
                        '&:hover .MuiOutlinedInput-notchedOutline': {
                          borderColor: 'primary.main',
                          borderWidth: 2
                        }
                      }
                    }}
                  >
                    {statusOptions.map(option => (
                      <MenuItem key={option.value} value={option.value}>
                        <Box display="flex" alignItems="center" gap={1}>
                          {option.value && (
                            <Chip 
                              label={option.label} 
                              color={option.color} 
                              size="small" 
                              sx={{ minWidth: 60 }}
                            />
                          )}
                          {!option.value && option.label}
                        </Box>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              {/* Date Range */}
              <Grid item xs={12} sm={6} md={3}>
                <TextField
                  fullWidth
                  label="Start Date"
                  type="date"
                  value={filters.startDate}
                  onChange={(e) => handleFilterChange('startDate', e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 2,
                      '&:hover .MuiOutlinedInput-notchedOutline': {
                        borderColor: 'primary.main',
                        borderWidth: 2
                      }
                    }
                  }}
                />
              </Grid>

              <Grid item xs={12} sm={6} md={3}>
                <TextField
                  fullWidth
                  label="End Date"
                  type="date"
                  value={filters.endDate}
                  onChange={(e) => handleFilterChange('endDate', e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 2,
                      '&:hover .MuiOutlinedInput-notchedOutline': {
                        borderColor: 'primary.main',
                        borderWidth: 2
                      }
                    }
                  }}
                />
              </Grid>

              <Grid item xs={12} sm={6} md={3}>
                <Box display="flex" gap={1} height="100%" alignItems="flex-end">
                  <Button
                    variant="outlined"
                    onClick={applyStatusFilter}
                    disabled={!filters.status}
                    startIcon={<FilterIcon style={{ color: '#1976d2' }} />}
                    sx={{
                      borderRadius: 2,
                      minWidth: 160,
                      color: '#1976d2',
                      borderColor: '#1976d2',
                      background: '#fff',
                      fontWeight: 600,
                      '&:hover': {
                        background: '#e3f0fd',
                        borderColor: '#1565c0',
                        color: '#1565c0',
                      },
                      '& .MuiButton-startIcon': { color: '#1976d2' }
                    }}
                  >
                    Filter Status
                  </Button>
                  <Button
                    variant="outlined"
                    onClick={applyDateFilter}
                    disabled={!filters.startDate || !filters.endDate}
                    startIcon={<CalendarIcon />}
                    sx={{
                      borderRadius: 2,
                      borderWidth: 2,
                      '&:hover': { borderWidth: 2 }
                    }}
                  >
                    Filter Date
                  </Button>
                </Box>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* Analytics Section */}
        <Collapse in={showAnalytics}>
          <Card elevation={2} sx={{ borderRadius: 3, mb: 3 }}>
            <CardContent sx={{ p: 3 }}>
              <Box display="flex" alignItems="center" gap={2} mb={3}>
                <Box
                  sx={{
                    p: 1,
                    borderRadius: 1.5,
                    background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                    color: 'white'
                  }}
                >
                  <AnalyticsIcon />
                </Box>
                <Typography variant="h6" fontWeight="bold" color="primary">
                  Analytics & Summary
                </Typography>
              </Box>

              <Grid container spacing={3}>
                <Grid item xs={12} sm={6} md={4}>
                  <Button
                    fullWidth
                    variant="outlined"
                    onClick={loadSummaryByAccounts}
                    disabled={userRole !== 'admin'}
                    startIcon={<AccountBalanceIcon />}
                    sx={{
                      py: 2,
                      borderRadius: 2,
                      borderWidth: 2,
                      '&:hover': { 
                        borderWidth: 2,
                        background: 'rgba(103, 126, 234, 0.1)'
                      }
                    }}
                  >
                    <Box textAlign="left">
                      <Typography variant="subtitle1" fontWeight="bold">
                        Summary by Accounts
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {userRole === 'admin' ? 'View account-wise analytics' : 'Admin access required'}
                      </Typography>
                    </Box>
                  </Button>
                </Grid>

                <Grid item xs={12} sm={6} md={4}>
                  <Button
                    fullWidth
                    variant="outlined"
                    onClick={loadSummaryByDays}
                    startIcon={<TrendingUpIcon />}
                    sx={{
                      py: 2,
                      borderRadius: 2,
                      borderWidth: 2,
                      '&:hover': { 
                        borderWidth: 2,
                        background: 'rgba(240, 147, 251, 0.1)'
                      }
                    }}
                  >
                    <Box textAlign="left">
                      <Typography variant="subtitle1" fontWeight="bold">
                        Summary by Days
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        View daily order analytics
                      </Typography>
                    </Box>
                  </Button>
                </Grid>

                <Grid item xs={12} sm={6} md={4}>
                  <Button
                    fullWidth
                    variant="outlined"
                    onClick={resetFilters}
                    startIcon={<RefreshIcon />}
                    sx={{
                      py: 2,
                      borderRadius: 2,
                      borderWidth: 2,
                      '&:hover': { 
                        borderWidth: 2,
                        background: 'rgba(255, 193, 7, 0.1)'
                      }
                    }}
                  >
                    <Box textAlign="left">
                      <Typography variant="subtitle1" fontWeight="bold">
                        Reset All
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Clear filters and analytics
                      </Typography>
                    </Box>
                  </Button>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Collapse>

        {/* Summary Results */}
        {summary.accounts && (
          <Slide direction="up" in={!!summary.accounts}>
            <Card elevation={3} sx={{ borderRadius: 3, mb: 2 }}>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="h6" fontWeight="bold" gutterBottom color="primary">
                  📊 Summary by Accounts
                </Typography>
                <Grid container spacing={3}>
                  {summary.accounts.map((account, index) => (
                    <Grid item xs={12} sm={6} md={4} key={index}>
                      <Box 
                        p={3} 
                        borderRadius={3}
                        sx={{
                          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                          color: 'white',
                          transition: 'transform 0.2s',
                          '&:hover': { transform: 'translateY(-4px)' }
                        }}
                      >
                        <Typography variant="h6" fontWeight="bold" mb={2}>
                          {account.account_name}
                        </Typography>
                        <Box display="flex" justifyContent="space-between" mb={1}>
                          <Typography variant="body2">Orders:</Typography>
                          <Typography variant="body2" fontWeight="bold">
                            {account.total_orders}
                          </Typography>
                        </Box>
                        <Box display="flex" justifyContent="space-between" mb={1}>
                          <Typography variant="body2">Revenue:</Typography>
                          <Typography variant="body2" fontWeight="bold">
                            ${account.total_revenue || 0}
                          </Typography>
                        </Box>
                        <Box display="flex" justifyContent="space-between">
                          <Typography variant="body2">Average:</Typography>
                          <Typography variant="body2" fontWeight="bold">
                            ${account.avg_order_value || 0}
                          </Typography>
                        </Box>
                      </Box>
                    </Grid>
                  ))}
                </Grid>
              </CardContent>
            </Card>
          </Slide>
        )}

        {summary.days && (
          <Slide direction="up" in={!!summary.days}>
            <Card elevation={3} sx={{ borderRadius: 3 }}>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="h6" fontWeight="bold" gutterBottom color="primary">
                  📈 Summary by Days
                </Typography>
                <Grid container spacing={3}>
                  {summary.days.map((day, index) => (
                    <Grid item xs={12} sm={6} md={4} key={index}>
                      <Box 
                        p={3} 
                        borderRadius={3}
                        sx={{
                          background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                          color: 'white',
                          transition: 'transform 0.2s',
                          '&:hover': { transform: 'translateY(-4px)' }
                        }}
                      >
                        <Typography variant="h6" fontWeight="bold" mb={2}>
                          {day.order_date}
                        </Typography>
                        <Box display="flex" justifyContent="space-between" mb={1}>
                          <Typography variant="body2">Total Orders:</Typography>
                          <Typography variant="body2" fontWeight="bold">
                            {day.total_orders}
                          </Typography>
                        </Box>
                        <Box display="flex" justifyContent="space-between" mb={2}>
                          <Typography variant="body2">Revenue:</Typography>
                          <Typography variant="body2" fontWeight="bold">
                            ${day.total_revenue || 0}
                          </Typography>
                        </Box>
                        <Box display="flex" flexWrap="wrap" gap={1}>
                          <Chip 
                            label={`Pending: ${day.pending_orders}`} 
                            color="warning" 
                            size="small" 
                            sx={{ background: 'rgba(255,255,255,0.2)', color: 'white' }}
                          />
                          <Chip 
                            label={`Completed: ${day.completed_orders}`} 
                            color="success" 
                            size="small" 
                            sx={{ background: 'rgba(255,255,255,0.2)', color: 'white' }}
                          />
                          <Chip 
                            label={`Processing: ${day.processing_orders}`} 
                            color="info" 
                            size="small" 
                            sx={{ background: 'rgba(255,255,255,0.2)', color: 'white' }}
                          />
                        </Box>
                      </Box>
                    </Grid>
                  ))}
                </Grid>
              </CardContent>
            </Card>
          </Slide>
        )}
      </Paper>
    </Fade>
  );
};

export default OrderFilters; 