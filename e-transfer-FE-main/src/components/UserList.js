import React, { useState, useEffect } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Typography,
  Box,
  IconButton,
  Chip,
  Alert,
  CircularProgress,
  Tooltip,
  Grid,
  Card,
  CardContent,
  Avatar
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  Refresh as RefreshIcon,
  People as PeopleIcon,
  AccountCircle as AccountIcon,
  Phone as PhoneIcon,
  CalendarToday as CalendarIcon
} from '@mui/icons-material';
import { userService } from '../services/userService';
import EditUserDialog from './EditUserDialog';
import CreateUserDialog from './CreateUserDialog';
import UserDetailDialog from './UserDetailDialog';
import { accountService } from '../services/authService';

const UserList = ({ onNavigate }) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editUserId, setEditUserId] = useState(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [detailUserId, setDetailUserId] = useState(null);

  // Get role from localStorage
  const userRole = (() => {
    try {
      const userData = JSON.parse(localStorage.getItem('user'));
      if (userData && userData.role) return userData.role;
    } catch (e) {}
    return 'user';
  })();

  useEffect(() => {
    fetchUsers();
  }, []);

  // Use accountService.getAllAccounts like AccountList
  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await accountService.getAllAccounts();
      let usersData = [];
      if (Array.isArray(response)) {
        usersData = response;
      } else if (response && Array.isArray(response.data)) {
        usersData = response.data;
      } else if (response && Array.isArray(response.accounts)) {
        usersData = response.accounts;
      } else if (response && response.success && Array.isArray(response.data)) {
        usersData = response.data;
      } else {
        console.error('Unexpected API response structure:', response);
        setError('Invalid data format received from server');
        return;
      }
      setUsers(usersData);
      setError('');
    } catch (error) {
      console.error('Fetch users error:', error);
      setError(error.message || 'Failed to load user list');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenEditDialog = (userId) => {
    setEditUserId(userId);
    setEditDialogOpen(true);
  };

  const handleCloseEditDialog = () => {
    setEditDialogOpen(false);
    setEditUserId(null);
  };

  const handleEditSuccess = () => {
    fetchUsers();
    handleCloseEditDialog();
  };

  const handleOpenCreateDialog = () => setCreateDialogOpen(true);
  const handleCloseCreateDialog = () => setCreateDialogOpen(false);
  const handleCreateSuccess = () => {
    fetchUsers();
    handleCloseCreateDialog();
  };

  const handleOpenDetailDialog = (userId) => {
    setDetailUserId(userId);
    setDetailDialogOpen(true);
  };

  const handleCloseDetailDialog = () => {
    setDetailDialogOpen(false);
    setDetailUserId(null);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this user?')) {
      try {
        await userService.deleteUser(id);
        fetchUsers();
      } catch (error) {
        setError(error.message || 'Cannot delete user');
      }
    }
  };

  const getRoleColor = (role) => {
    switch (role) {
      case 'admin':
        return 'error';
      case 'manager':
        return 'warning';
      case 'user':
        return 'primary';
      default:
        return 'default';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
        return 'success';
      case 'inactive':
        return 'error';
      case 'pending':
        return 'warning';
      default:
        return 'default';
    }
  };

  // Calculate statistics
  const totalUsers = Array.isArray(users) ? users.length : 0;
  const activeUsers = Array.isArray(users) ? users.filter(user => user.status !== 'inactive').length : 0;
  const adminUsers = Array.isArray(users) ? users.filter(user => user.role === 'admin').length : 0;
  const managerUsers = Array.isArray(users) ? users.filter(user => user.role === 'manager').length : 0;

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
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
        <Box>
          <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 'bold' }}>
            User Management
          </Typography>
          <Typography variant="body1" color="textSecondary">
            Manage and monitor all system users
          </Typography>
        </Box>
        <Box display="flex" gap={2}>
          <Tooltip title="Refresh">
            <IconButton 
              onClick={fetchUsers} 
              sx={{ 
                bgcolor: 'primary.main', 
                color: 'white',
                '&:hover': { bgcolor: 'primary.dark' }
              }}
            >
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleOpenCreateDialog}
            sx={{ 
              borderRadius: 2,
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              '&:hover': {
                background: 'linear-gradient(135deg, #5a6fd8 0%, #6a4190 100%)'
              }
            }}
          >
            Add User
          </Button>
        </Box>
      </Box>

      {/* Statistics Cards */}
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ 
            height: '100%', 
            background: 'linear-gradient(135deg, #667eea15 0%, #667eea05 100%)',
            border: '1px solid rgba(102, 126, 234, 0.1)'
          }}>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="textSecondary" gutterBottom variant="h6">
                    Total Users
                  </Typography>
                  <Typography variant="h4" component="div" sx={{ fontWeight: 'bold', color: '#667eea' }}>
                    {totalUsers}
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: '#667eea', width: 56, height: 56 }}>
                  <PeopleIcon />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ 
            height: '100%', 
            background: 'linear-gradient(135deg, #2e7d3215 0%, #2e7d3205 100%)',
            border: '1px solid rgba(46, 125, 50, 0.1)'
          }}>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="textSecondary" gutterBottom variant="h6">
                    Active Users
                  </Typography>
                  <Typography variant="h4" component="div" sx={{ fontWeight: 'bold', color: '#2e7d32' }}>
                    {activeUsers}
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: '#2e7d32', width: 56, height: 56 }}>
                  <AccountIcon />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ 
            height: '100%', 
            background: 'linear-gradient(135deg, #ed6c0215 0%, #ed6c0205 100%)',
            border: '1px solid rgba(237, 108, 2, 0.1)'
          }}>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="textSecondary" gutterBottom variant="h6">
                    Admin Users
                  </Typography>
                  <Typography variant="h4" component="div" sx={{ fontWeight: 'bold', color: '#ed6c02' }}>
                    {adminUsers}
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: '#ed6c02', width: 56, height: 56 }}>
                  <AccountIcon />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ 
            height: '100%', 
            background: 'linear-gradient(135deg, #9c27b015 0%, #9c27b005 100%)',
            border: '1px solid rgba(156, 39, 176, 0.1)'
          }}>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="textSecondary" gutterBottom variant="h6">
                    Manager Users
                  </Typography>
                  <Typography variant="h4" component="div" sx={{ fontWeight: 'bold', color: '#9c27b0' }}>
                    {managerUsers}
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: '#9c27b0', width: 56, height: 56 }}>
                  <PeopleIcon />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Users Table */}
      <Card sx={{ 
        borderRadius: 3, 
        overflow: 'hidden',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        border: '1px solid rgba(0, 0, 0, 0.05)'
      }}>
        <Box sx={{ 
          p: 3, 
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white'
        }}>
          <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
            User List
          </Typography>
          <Typography variant="body2" sx={{ opacity: 0.9 }}>
            Manage all system users and their permissions
          </Typography>
        </Box>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ backgroundColor: '#f8fafc' }}>
                <TableCell sx={{ fontWeight: 'bold', color: '#374151' }}>User</TableCell>
                <TableCell sx={{ fontWeight: 'bold', color: '#374151' }}>Contact Info</TableCell>
                <TableCell sx={{ fontWeight: 'bold', color: '#374151' }}>Role</TableCell>
                <TableCell sx={{ fontWeight: 'bold', color: '#374151' }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 'bold', color: '#374151' }}>Created</TableCell>
                <TableCell sx={{ fontWeight: 'bold', color: '#374151' }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {Array.isArray(users) && users.length > 0 ? (
                users.map((user) => (
                  <TableRow key={user.id} hover sx={{ '&:hover': { backgroundColor: '#f9fafb' } }}>
                    <TableCell>
                      <Box display="flex" alignItems="center" gap={2}>
                        <Avatar sx={{ 
                          bgcolor: user.role === 'admin' ? '#ef4444' : user.role === 'manager' ? '#f59e0b' : '#667eea',
                          width: 40,
                          height: 40
                        }}>
                          {(user.first_name && user.first_name.charAt(0).toUpperCase()) ||
                           (user.username && user.username.charAt(0).toUpperCase()) ||
                           'U'}
                        </Avatar>
                        <Box>
                          <Typography variant="body2" fontWeight="medium">
                            {user.first_name} {user.last_name}
                          </Typography>
                          <Typography variant="caption" color="textSecondary">
                            @{user.username}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box>
                        <Typography variant="body2" fontWeight="medium">
                          {user.email}
                        </Typography>
                        <Box display="flex" alignItems="center" gap={1}>
                          <PhoneIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                          <Typography variant="caption" color="textSecondary">
                            {user.phone || 'No phone'}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={user.role}
                        color={getRoleColor(user.role)}
                        size="small"
                        sx={{ 
                          textTransform: 'capitalize',
                          fontWeight: 'medium'
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={user.status || 'active'}
                        color={getStatusColor(user.status)}
                        size="small"
                        sx={{ 
                          textTransform: 'capitalize',
                          fontWeight: 'medium'
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <Box display="flex" alignItems="center" gap={1}>
                        <CalendarIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                        <Typography variant="body2">
                          {user.created_at 
                            ? new Date(user.created_at).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric'
                              })
                            : 'N/A'
                          }
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box display="flex" gap={1}>
                        <Tooltip title="View details">
                          <IconButton
                            size="small"
                            onClick={() => handleOpenDetailDialog(user.id)}
                            sx={{ 
                              color: 'primary.main',
                              '&:hover': { bgcolor: 'primary.light', color: 'white' }
                            }}
                          >
                            <ViewIcon />
                          </IconButton>
                        </Tooltip>
                        {userRole === 'admin' && (
                          <>
                            <Tooltip title="Edit user">
                              <IconButton
                                size="small"
                                onClick={() => handleOpenEditDialog(user.id)}
                                sx={{ 
                                  color: 'warning.main',
                                  '&:hover': { bgcolor: 'warning.light', color: 'white' }
                                }}
                              >
                                <EditIcon />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Delete user">
                              <IconButton
                                size="small"
                                onClick={() => handleDelete(user.id)}
                                sx={{ 
                                  color: 'error.main',
                                  '&:hover': { bgcolor: 'error.light', color: 'white' }
                                }}
                              >
                                <DeleteIcon />
                              </IconButton>
                            </Tooltip>
                          </>
                        )}
                      </Box>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 6 }}>
                    <Box textAlign="center">
                      <PeopleIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                      <Typography variant="h6" color="text.secondary" gutterBottom>
                        No users found
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {Array.isArray(users) ? 'Start by adding your first user' : 'Loading users...'}
                      </Typography>
                    </Box>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      {/* Edit User Dialog */}
      <EditUserDialog
        open={editDialogOpen}
        userId={editUserId}
        onClose={handleCloseEditDialog}
        onSuccess={handleEditSuccess}
      />

      {/* Create User Dialog */}
      <CreateUserDialog
        open={createDialogOpen}
        onClose={handleCloseCreateDialog}
        onSuccess={handleCreateSuccess}
      />

      {/* User Detail Dialog */}
      <UserDetailDialog
        open={detailDialogOpen}
        userId={detailUserId}
        onClose={handleCloseDetailDialog}
      />
    </Box>
  );
};

export default UserList; 