import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Chip,
  Alert,
  CircularProgress,
  Tooltip,
  Avatar
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  Refresh as RefreshIcon,
  People as PeopleIcon,
  Language as LanguageIcon,
  CalendarToday as CalendarIcon,
  AccountBalance as AccountBalanceIcon,
  Security as SecurityIcon
} from '@mui/icons-material';
import { accountService } from '../services/authService';
import EditAccountDialog from './EditAccountDialog';
import RegisterDialog from './RegisterDialog';
import AccountDetailDialog from './AccountDetailDialog';

const AccountList = ({ onNavigate }) => {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editAccountId, setEditAccountId] = useState(null);
  const [registerDialogOpen, setRegisterDialogOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [detailAccountId, setDetailAccountId] = useState(null);

  // Get role from localStorage
  const userRole = (() => {
    try {
      const userData = JSON.parse(localStorage.getItem('user'));
      if (userData && userData.role) return userData.role;
    } catch (e) {}
    return 'customer';
  })();

  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    try {
      setLoading(true);
      const response = await accountService.getAllAccounts();
      
      // Handle API response structure
      let accountsData = [];
      if (Array.isArray(response)) {
        accountsData = response;
      } else if (response && Array.isArray(response.data)) {
        accountsData = response.data;
      } else if (response && Array.isArray(response.accounts)) {
        accountsData = response.accounts;
      } else if (response && response.success && Array.isArray(response.data)) {
        accountsData = response.data;
      } else {
        console.error('Unexpected API response structure:', response);
        setError('Invalid data format received from server');
        return;
      }
      
      setAccounts(accountsData);
      setError('');
    } catch (error) {
      console.error('Fetch accounts error:', error);
      setError(error.message || 'Failed to load account list');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenEditDialog = (accountId) => {
    setEditAccountId(accountId);
    setEditDialogOpen(true);
  };

  const handleCloseEditDialog = () => {
    setEditDialogOpen(false);
    setEditAccountId(null);
  };

  const handleEditSuccess = () => {
    fetchAccounts();
    handleCloseEditDialog();
  };

  const handleOpenRegisterDialog = () => setRegisterDialogOpen(true);
  const handleCloseRegisterDialog = () => setRegisterDialogOpen(false);
  const handleRegisterSuccess = () => {
    fetchAccounts();
    handleCloseRegisterDialog();
  };

  const handleOpenDetailDialog = (accountId) => {
    setDetailAccountId(accountId);
    setDetailDialogOpen(true);
  };

  const handleCloseDetailDialog = () => {
    setDetailDialogOpen(false);
    setDetailAccountId(null);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this account?')) {
      try {
        await accountService.deleteAccount(id);
        fetchAccounts();
      } catch (error) {
        setError(error.message || 'Cannot delete account');
      }
    }
  };

  const getRoleColor = (role) => {
    switch (role) {
      case 'admin':
        return 'error';
      case 'customer':
        return 'primary';
      default:
        return 'default';
    }
  };

  // Calculate statistics
  const totalAccounts = Array.isArray(accounts) ? accounts.length : 0;
  const activeAccounts = Array.isArray(accounts) ? accounts.filter(acc => acc.status !== 'inactive').length : 0;
  const adminAccounts = Array.isArray(accounts) ? accounts.filter(acc => acc.role === 'admin').length : 0;

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
            User List
          </Typography>
          <Typography variant="body1" color="textSecondary">
            Manage all system users and their permissions
          </Typography>
        </Box>
        <Box display="flex" gap={2}>
          <Tooltip title="Refresh">
            <IconButton 
              onClick={fetchAccounts} 
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
            onClick={handleOpenRegisterDialog}
            sx={{ 
              borderRadius: 2,
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              '&:hover': {
                background: 'linear-gradient(135deg, #5a6fd8 0%, #6a4190 100%)'
              }
            }}
          >
            Add Account
          </Button>
        </Box>
      </Box>

      {/* Statistics Cards */}
      <Grid container spacing={3} mb={4} justifyContent="center">
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ 
            height: '100%', 
            background: 'linear-gradient(135deg, #667eea15 0%, #667eea05 100%)',
            border: '1px solid rgba(102, 126, 234, 0.1)',
            textAlign: 'center'
          }}>
            <CardContent>
              <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center">
                <Avatar sx={{ bgcolor: '#667eea', width: 56, height: 56, mb: 2 }}>
                  <PeopleIcon />
                </Avatar>
                <Typography color="textSecondary" gutterBottom variant="h6">
                  Total Accounts
                </Typography>
                <Typography variant="h4" component="div" sx={{ fontWeight: 'bold', color: '#667eea' }}>
                  {totalAccounts}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ 
            height: '100%', 
            background: 'linear-gradient(135deg, #2e7d3215 0%, #2e7d3205 100%)',
            border: '1px solid rgba(46, 125, 50, 0.1)',
            textAlign: 'center'
          }}>
            <CardContent>
              <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center">
                <Avatar sx={{ bgcolor: '#2e7d32', width: 56, height: 56, mb: 2 }}>
                  <SecurityIcon />
                </Avatar>
                <Typography color="textSecondary" gutterBottom variant="h6">
                  Active Accounts
                </Typography>
                <Typography variant="h4" component="div" sx={{ fontWeight: 'bold', color: '#2e7d32' }}>
                  {activeAccounts}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ 
            height: '100%', 
            background: 'linear-gradient(135deg, #ed6c0215 0%, #ed6c0205 100%)',
            border: '1px solid rgba(237, 108, 2, 0.1)',
            textAlign: 'center'
          }}>
            <CardContent>
              <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center">
                <Avatar sx={{ bgcolor: '#ed6c02', width: 56, height: 56, mb: 2 }}>
                  <SecurityIcon />
                </Avatar>
                <Typography color="textSecondary" gutterBottom variant="h6">
                  Admin Accounts
                </Typography>
                <Typography variant="h4" component="div" sx={{ fontWeight: 'bold', color: '#ed6c02' }}>
                  {adminAccounts}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ 
            height: '100%', 
            background: 'linear-gradient(135deg, #9c27b015 0%, #9c27b005 100%)',
            border: '1px solid rgba(156, 39, 176, 0.1)',
            textAlign: 'center'
          }}>
            <CardContent>
              <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center">
                <Avatar sx={{ bgcolor: '#9c27b0', width: 56, height: 56, mb: 2 }}>
                  <AccountBalanceIcon />
                </Avatar>
                <Typography color="textSecondary" gutterBottom variant="h6">
                  Customer Accounts
                </Typography>
                <Typography variant="h4" component="div" sx={{ fontWeight: 'bold', color: '#9c27b0' }}>
                  {totalAccounts - adminAccounts}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Accounts Table */}
      <Card>
        <CardContent>
          <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2 }}>
            Account List
          </Typography>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow sx={{ backgroundColor: '#f8fafc' }}>
                  <TableCell sx={{ fontWeight: 'bold', color: '#374151' }}>Account</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', color: '#374151' }}>Contact Info</TableCell>
                  {userRole === 'admin' && (
                    <TableCell sx={{ fontWeight: 'bold', color: '#374151' }}>Role</TableCell>
                  )}
                  <TableCell sx={{ fontWeight: 'bold', color: '#374151' }}>Website</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', color: '#374151' }}>Created</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', color: '#374151' }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {Array.isArray(accounts) && accounts.length > 0 ? (
                  accounts.map((account) => (
                    <TableRow key={account.id} hover sx={{ '&:hover': { backgroundColor: '#f9fafb' } }}>
                      <TableCell>
                        <Box display="flex" alignItems="center" gap={2}>
                          <Avatar sx={{ bgcolor: account.role === 'admin' ? '#ef4444' : '#667eea', width: 40, height: 40 }}>
                            {(account.first_name && account.first_name.charAt(0).toUpperCase()) ||
                             (account.email && account.email.charAt(0).toUpperCase()) ||
                             'A'}
                          </Avatar>
                          <Box>
                            <Typography variant="body2" fontWeight="medium">
                              {account.last_name && account.first_name 
                                ? `${account.last_name} ${account.first_name}`
                                : account.first_name || account.last_name || 'N/A'
                              }
                            </Typography>
                            <Typography variant="caption" color="textSecondary">
                              @{account.username || 'username'}
                            </Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box>
                          <Typography variant="body2" fontWeight="medium">
                            {account.email}
                          </Typography>
                          <Typography variant="caption" color="textSecondary">
                            {account.phone || 'No phone'}
                          </Typography>
                        </Box>
                      </TableCell>
                      {userRole === 'admin' && (
                        <TableCell>
                          <Chip
                            label={account.role}
                            color={getRoleColor(account.role)}
                            size="small"
                            sx={{ 
                              textTransform: 'capitalize',
                              fontWeight: 'medium'
                            }}
                          />
                        </TableCell>
                      )}
                      <TableCell>
                        {account.url_site ? (
                          <Box display="flex" alignItems="center" gap={1}>
                            <LanguageIcon sx={{ fontSize: 16, color: 'primary.main' }} />
                            <a 
                              href={account.url_site} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              style={{ 
                                color: '#667eea', 
                                textDecoration: 'none',
                                wordBreak: 'break-all',
                                fontSize: '0.875rem'
                              }}
                            >
                              {account.url_site}
                            </a>
                          </Box>
                        ) : (
                          <Typography variant="body2" color="textSecondary">
                            No website
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Box display="flex" alignItems="center" gap={1}>
                          <CalendarIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                          <Typography variant="body2">
                            {account.create_date 
                              ? new Date(account.create_date).toLocaleDateString('en-US', {
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
                              onClick={() => handleOpenDetailDialog(account.id)}
                              sx={{ 
                                color: 'primary.main',
                                '&:hover': { bgcolor: 'primary.light', color: 'white' }
                              }}
                            >
                              <ViewIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Edit account">
                            <IconButton
                              size="small"
                              onClick={() => handleOpenEditDialog(account.id)}
                              sx={{ 
                                color: 'warning.main',
                                '&:hover': { bgcolor: 'warning.light', color: 'white' }
                              }}
                            >
                              <EditIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete account">
                            <IconButton
                              size="small"
                              onClick={() => handleDelete(account.id)}
                              sx={{ 
                                color: 'error.main',
                                '&:hover': { bgcolor: 'error.light', color: 'white' }
                              }}
                            >
                              <DeleteIcon />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={userRole === 'admin' ? 6 : 5} align="center" sx={{ py: 6 }}>
                      <Box textAlign="center">
                        <PeopleIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                        <Typography variant="h6" color="text.secondary" gutterBottom>
                          No accounts found
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {Array.isArray(accounts) ? 'Start by adding your first account' : 'Loading accounts...'}
                        </Typography>
                      </Box>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* Edit Account Dialog */}
      <EditAccountDialog
        open={editDialogOpen}
        accountId={editAccountId}
        onClose={handleCloseEditDialog}
        onSuccess={handleEditSuccess}
      />

      {/* Register Dialog */}
      <RegisterDialog
        open={registerDialogOpen}
        onClose={handleCloseRegisterDialog}
        onSuccess={handleRegisterSuccess}
      />

      {/* Account Detail Dialog */}
      <AccountDetailDialog
        open={detailDialogOpen}
        accountId={detailAccountId}
        onClose={handleCloseDetailDialog}
      />
    </Box>
  );
};

export default AccountList; 