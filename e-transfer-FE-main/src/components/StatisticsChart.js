import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Grid,
  LinearProgress
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon
} from '@mui/icons-material';

const StatisticsChart = ({ orders }) => {
  // Check if orders is array
  if (!Array.isArray(orders)) {
    return (
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Detailed Statistics
          </Typography>
          <Typography variant="body2" color="textSecondary">
            Loading data...
          </Typography>
        </CardContent>
      </Card>
    );
  }

  // Calculate statistics
  const totalAmount = orders.reduce((sum, order) => sum + (order.total_amount || 0), 0);
  const totalOrders = orders.length;
  
  // Calculate transactions by month
  const monthlyStats = orders.reduce((acc, order) => {
    const date = new Date(order.create_date);
    const month = date.getMonth();
    const year = date.getFullYear();
    const key = `${year}-${month + 1}`;
    
    if (!acc[key]) {
      acc[key] = { count: 0, amount: 0 };
    }
    acc[key].count += 1;
    acc[key].amount += order.total_amount || 0;
    
    return acc;
  }, {});

  // Get last 6 months
  const recentMonths = Object.keys(monthlyStats)
    .sort()
    .slice(-6);

  const formatCurrency = (amount) => {
    if (!amount) return '$0';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatMonth = (monthKey) => {
    const [year, month] = monthKey.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  };

  // Calculate growth rate
  const calculateGrowth = () => {
    if (recentMonths.length < 2) return 0;
    
    const currentMonth = recentMonths[recentMonths.length - 1];
    const previousMonth = recentMonths[recentMonths.length - 2];
    
    const currentAmount = monthlyStats[currentMonth]?.amount || 0;
    const previousAmount = monthlyStats[previousMonth]?.amount || 0;
    
    if (previousAmount === 0) return currentAmount > 0 ? 100 : 0;
    
    return ((currentAmount - previousAmount) / previousAmount) * 100;
  };

  const growth = calculateGrowth();

  return (
    <Card sx={{ mb: 3 }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Detailed Statistics
        </Typography>
        
        {/* Growth */}
        <Box display="flex" alignItems="center" gap={1} mb={3}>
          <Typography variant="body2" color="textSecondary">
            This month's growth:
          </Typography>
          <Box display="flex" alignItems="center" gap={0.5}>
            {growth >= 0 ? (
              <TrendingUpIcon color="success" fontSize="small" />
            ) : (
              <TrendingDownIcon color="error" fontSize="small" />
            )}
            <Typography
              variant="body2"
              color={growth >= 0 ? 'success.main' : 'error.main'}
              fontWeight="bold"
            >
              {growth >= 0 ? '+' : ''}{growth.toFixed(1)}%
            </Typography>
          </Box>
        </Box>

        {/* Monthly Chart */}
        <Typography variant="subtitle2" gutterBottom>
          Transactions by month (Last 6 months)
        </Typography>
        
        <Grid container spacing={2}>
          {recentMonths.map((monthKey) => {
            const monthData = monthlyStats[monthKey];
            const maxAmount = Math.max(...Object.values(monthlyStats).map(d => d.amount));
            const percentage = maxAmount > 0 ? (monthData.amount / maxAmount) * 100 : 0;
            
            return (
              <Grid item xs={12} sm={6} md={4} key={monthKey}>
                <Box>
                  <Box display="flex" justifyContent="space-between" mb={1}>
                    <Typography variant="caption" color="textSecondary">
                      {formatMonth(monthKey)}
                    </Typography>
                    <Typography variant="caption" fontWeight="bold">
                      {monthData.count} transactions
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={percentage}
                    sx={{ height: 8, borderRadius: 4 }}
                  />
                  <Typography variant="caption" color="textSecondary" display="block" mt={0.5}>
                    {formatCurrency(monthData.amount)}
                  </Typography>
                </Box>
              </Grid>
            );
          })}
        </Grid>

        {/* Overview Statistics */}
        <Box mt={3} pt={2} borderTop={1} borderColor="divider">
          <Grid container spacing={2}>
            <Grid item xs={6}>
              <Typography variant="body2" color="textSecondary">
                Total transactions
              </Typography>
              <Typography variant="h6">
                {totalOrders}
              </Typography>
            </Grid>
            <Grid item xs={6}>
              <Typography variant="body2" color="textSecondary">
                Total value
              </Typography>
              <Typography variant="h6" color="success.main">
                {formatCurrency(totalAmount)}
              </Typography>
            </Grid>
            <Grid item xs={6}>
              <Typography variant="body2" color="textSecondary">
                Average/transaction
              </Typography>
              <Typography variant="h6">
                {totalOrders > 0 ? formatCurrency(totalAmount / totalOrders) : '$0'}
              </Typography>
            </Grid>
            <Grid item xs={6}>
              <Typography variant="body2" color="textSecondary">
                Highest month
              </Typography>
              <Typography variant="h6">
                {recentMonths.length > 0 ? formatMonth(recentMonths[recentMonths.length - 1]) : 'N/A'}
              </Typography>
            </Grid>
          </Grid>
        </Box>
      </CardContent>
    </Card>
  );
};

export default StatisticsChart; 