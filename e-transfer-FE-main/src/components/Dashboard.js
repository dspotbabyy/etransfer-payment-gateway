import React, { useState, useEffect } from 'react';
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  Paper,
  LinearProgress,
  Chip,
  Avatar,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Divider,
  IconButton
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  ShoppingCart as OrdersIcon,
  People as UsersIcon,
  AttachMoney as RevenueIcon,
  MoreVert as MoreVertIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  Analytics as AnalyticsIcon
} from '@mui/icons-material';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { orderService } from '../services/orderService';
import { userService } from '../services/userService';

const Dashboard = () => {
  const [stats, setStats] = useState({
    totalOrders: 0,
    totalRevenue: 0,
    totalUsers: 0,
    growthRate: 0
  });
  const [recentOrders, setRecentOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [chartData, setChartData] = useState([]);
  const [pieData, setPieData] = useState([
    { name: 'Completed', value: 0, color: '#4CAF50' },
    { name: 'Pending', value: 0, color: '#FF9800' },
    { name: 'Cancelled', value: 0, color: '#F44336' },
  ]);

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const userEmail = user.email || '';

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      try {
        // 1. Fetch recent orders (for list and pie chart)
        const ordersRes = await orderService.getAllOrders(userEmail);
        let orders = [];
        if (ordersRes.success && Array.isArray(ordersRes.data)) {
          orders = ordersRes.data;
          const sorted = orders.slice().sort((a, b) => new Date(b.date) - new Date(a.date));
          setRecentOrders(sorted.slice(0, 5));
        } else {
          setRecentOrders([]);
        }

        // 2. Pie chart: count by status
        const statusCount = { completed: 0, pending: 0, cancelled: 0 };
        orders.forEach(order => {
          if (order.status === 'completed') statusCount.completed++;
          else if (order.status === 'pending') statusCount.pending++;
          else if (order.status === 'cancelled') statusCount.cancelled++;
        });
        setPieData([
          { name: 'Completed', value: statusCount.completed, color: '#4CAF50' },
          { name: 'Pending', value: statusCount.pending, color: '#FF9800' },
          { name: 'Cancelled', value: statusCount.cancelled, color: '#F44336' },
        ]);

        // 3. Fetch order/revenue summary by days (for stats and chart)
        const summaryRes = await orderService.getSummaryByDays(userEmail);
        let totalOrders = 0, totalRevenue = 0, growthRate = 0;
        let chartArr = [];
        if (summaryRes.success && Array.isArray(summaryRes.data)) {
          chartArr = summaryRes.data.map(day => ({
            name: day.date || day.day || '',
            orders: day.total_orders || 0,
            revenue: day.total_revenue || 0
          }));
          // Use last entry as current, previous as last month for growth
          if (chartArr.length > 0) {
            totalOrders = chartArr.reduce((sum, d) => sum + (d.orders || 0), 0);
            totalRevenue = chartArr.reduce((sum, d) => sum + (d.revenue || 0), 0);
            // Calculate growth rate (last vs previous period)
            const len = chartArr.length;
            if (len > 1 && chartArr[len-2].orders > 0) {
              growthRate = Math.round(((chartArr[len-1].orders - chartArr[len-2].orders) / chartArr[len-2].orders) * 100);
            }
          }
        }
        setChartData(chartArr.slice(-6)); // last 6 periods

        // 4. Fetch user stats
        let totalUsers = 0;
        try {
          const userStats = await userService.getUserStats();
          if (userStats && (userStats.totalUsers || userStats.total_users)) {
            totalUsers = userStats.totalUsers || userStats.total_users;
          } else if (typeof userStats === 'number') {
            totalUsers = userStats;
          }
        } catch (e) { /* ignore user stats error */ }

        setStats({
          totalOrders,
          totalRevenue,
          totalUsers,
          growthRate
        });
      } catch (err) {
        setStats({ totalOrders: 0, totalRevenue: 0, totalUsers: 0, growthRate: 0 });
        setRecentOrders([]);
        setChartData([]);
        setPieData([
          { name: 'Completed', value: 0, color: '#4CAF50' },
          { name: 'Pending', value: 0, color: '#FF9800' },
          { name: 'Cancelled', value: 0, color: '#F44336' },
        ]);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboardData();
  }, [userEmail]);

  const StatCard = ({ title, value, icon, color, subtitle }) => (
    <Card sx={{ height: '100%', background: `linear-gradient(135deg, ${color}15 0%, ${color}05 100%)` }}>
      <CardContent>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box>
            <Typography color="textSecondary" gutterBottom variant="h6">
              {title}
            </Typography>
            <Typography variant="h4" component="div" sx={{ fontWeight: 'bold', color: color }}>
              {value}
            </Typography>
            {subtitle && (
              <Typography variant="body2" color="textSecondary">
                {subtitle}
              </Typography>
            )}
          </Box>
          <Avatar sx={{ bgcolor: color, width: 56, height: 56 }}>
            {icon}
          </Avatar>
        </Box>
      </CardContent>
    </Card>
  );

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircleIcon sx={{ color: 'success.main' }} />;
      case 'pending':
        return <WarningIcon sx={{ color: 'warning.main' }} />;
      case 'cancelled':
        return <ErrorIcon sx={{ color: 'error.main' }} />;
      default:
        return <CheckCircleIcon />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'success';
      case 'pending':
        return 'warning';
      case 'cancelled':
        return 'error';
      default:
        return 'default';
    }
  };

  if (loading) {
    return (
      <Box sx={{ width: '100%' }}>
        <LinearProgress />
      </Box>
    );
  }

  return (
    <Box>
      {/* Welcome Section */}
      <Box mb={4}>
        <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold' }}>
          Welcome back, Admin! 👋
        </Typography>
        <Typography variant="body1" color="textSecondary">
          Here's what's happening with your business today.
        </Typography>
      </Box>

      {/* Stats Cards */}
      <Grid container spacing={3} mb={4}>
                <Grid item xs={12} sm={6} md={4}>
          <StatCard
            title="Total Orders"
            value={parseInt(stats.totalOrders, 10).toString()}
            icon={<OrdersIcon />}
            color="#1976d2"
            subtitle={`+${stats.growthRate}% from last month`}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <StatCard
            title="Total Revenue"
            value={`$${parseFloat(stats.totalRevenue).toString()}`}
            icon={<RevenueIcon />}
            color="#2e7d32"
            subtitle="+8.2% from last month"
          />
        </Grid>
        
        <Grid item xs={12} sm={6} md={4}>
          <StatCard
            title="Growth Rate"
            value={`${stats.growthRate}%`}
            icon={<TrendingUpIcon />}
            color="#9c27b0"
            subtitle="+2.1% from last month"
          />
        </Grid>
      </Grid>

      {/* Charts Section: Order Status Distribution & Recent Orders side by side */}
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} lg={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 'bold' }} mb={3}>
                Order Status Distribution
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <Box mt={2}>
                {pieData.map((item, index) => (
                  <Box key={index} display="flex" alignItems="center" justifyContent="space-between" mb={1}>
                    <Box display="flex" alignItems="center">
                      <Box
                        sx={{
                          width: 12,
                          height: 12,
                          borderRadius: '50%',
                          bgcolor: item.color,
                          mr: 1
                        }}
                      />
                      <Typography variant="body2">{item.name}</Typography>
                    </Box>
                    <Typography variant="body2" fontWeight="bold">
                      {item.value}
                    </Typography>
                  </Box>
                ))}
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} lg={6}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between" mb={3}>
                <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                  Recent Orders
                </Typography>
                <IconButton size="small">
                  <MoreVertIcon />
                </IconButton>
              </Box>
              <List>
                {recentOrders.map((order, index) => (
                  <React.Fragment key={order.id}>
                    <ListItem>
                      <ListItemAvatar>
                        <Avatar sx={{ bgcolor: 'primary.main' }}>
                          {(order.customer && order.customer.charAt(0)) ||
                           (order.customer_name && order.customer_name.charAt(0)) ||
                           (order.customer_email && order.customer_email.charAt(0)) ||
                           'N'}
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={order.customer}
                        secondary={`Order #${order.id} • ${order.date}`}
                      />
                      <Box display="flex" alignItems="center" gap={2}>
                        <Typography variant="body2" fontWeight="bold">
                          {order.amount}
                        </Typography>
                        <Chip
                          icon={getStatusIcon(order.status)}
                          label={order.status}
                          color={getStatusColor(order.status)}
                          size="small"
                        />
                      </Box>
                    </ListItem>
                    {index < recentOrders.length - 1 && <Divider />}
                  </React.Fragment>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>
      </Grid>


    </Box>
  );
};

export default Dashboard; 