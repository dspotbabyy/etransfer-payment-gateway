import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Avatar,
  Grid,
  Chip,
  Divider,
  Button,
  Alert,
  Paper,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Snackbar,
  MenuItem
} from '@mui/material';
import {
  Person as PersonIcon,
  Email as EmailIcon,
  Business as BusinessIcon,
  CalendarToday as CalendarIcon,
  Security as SecurityIcon,
  Edit as EditIcon,
  Save as SaveIcon
} from '@mui/icons-material';
import { accountService } from '../services/authService';

const UserInfo = () => {
  const [userInfo, setUserInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editForm, setEditForm] = useState({});
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  useEffect(() => {
    const fetchUserDetails = async () => {
      try {
        setLoading(true);
        const user = localStorage.getItem('user');
        if (user) {
          const parsedUser = JSON.parse(user);
          
          // Lấy thông tin chi tiết từ API giống như AccountList
          try {
            const response = await accountService.getAccountById(parsedUser.id);
            if (response.success) {
              const detailedUser = response.data;
              setUserInfo(detailedUser);
              setEditForm({
                username: detailedUser.username || '',
                email: detailedUser.email || '',
                first_name: detailedUser.first_name || '',
                last_name: detailedUser.last_name || '',
                phone: detailedUser.phone || '',
                url_site: detailedUser.url_site || '',
                role: detailedUser.role || 'customer'
              });
            } else {
              // Fallback to localStorage data
              setUserInfo(parsedUser);
              setEditForm({
                username: parsedUser.username || '',
                email: parsedUser.email || '',
                first_name: parsedUser.first_name || '',
                last_name: parsedUser.last_name || '',
                phone: parsedUser.phone || '',
                url_site: parsedUser.url_site || '',
                role: parsedUser.role || 'customer'
              });
            }
          } catch (error) {
            console.error('Error fetching user details:', error);
            // Fallback to localStorage data
            setUserInfo(parsedUser);
            setEditForm({
              username: parsedUser.username || '',
              email: parsedUser.email || '',
              first_name: parsedUser.first_name || '',
              last_name: parsedUser.last_name || '',
              phone: parsedUser.phone || '',
              url_site: parsedUser.url_site || '',
              role: parsedUser.role || 'customer'
            });
          }
        }
      } catch (error) {
        console.error('Error parsing user data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserDetails();
  }, []);

  const clearStorage = () => {
    localStorage.clear();
    window.location.reload();
  };

  const handleEditClick = () => {
    setEditDialogOpen(true);
  };

  const handleCloseEditDialog = () => {
    setEditDialogOpen(false);
  };

  const handleSaveChanges = async () => {
    try {
      setSaving(true);
      
      // Validate required fields
      if (!editForm.email || !editForm.username || !editForm.role) {
        setSnackbar({
          open: true,
          message: 'Missing required information: email, username, role',
          severity: 'error'
        });
        setSaving(false);
        return;
      }
      
      // Sử dụng accountService.updateAccount giống như EditAccountDialog
      const response = await accountService.updateAccount(userInfo.id, editForm);
      
      if (response.success) {
        // Update localStorage với thông tin mới
        const updatedUser = { ...userInfo, ...editForm };
        localStorage.setItem('user', JSON.stringify(updatedUser));
        setUserInfo(updatedUser);
        
        setSnackbar({
          open: true,
          message: 'Profile updated successfully!',
          severity: 'success'
        });
        handleCloseEditDialog();
      } else {
        throw new Error(response.message || 'Failed to update profile');
      }
    } catch (error) {
      console.error('Update error:', error);
      setSnackbar({
        open: true,
        message: error.message || 'Failed to update profile',
        severity: 'error'
      });
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (field, value) => {
    setEditForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const getRoleColor = (role) => {
    switch (role?.toLowerCase()) {
      case 'admin':
        return 'error';
      case 'user':
        return 'primary';
      case 'manager':
        return 'warning';
      default:
        return 'default';
    }
  };

  const getRoleLabel = (role) => {
    switch (role?.toLowerCase()) {
      case 'admin':
        return 'Administrator';
      case 'user':
        return 'User';
      case 'manager':
        return 'Manager';
      default:
        return role || 'Unknown';
    }
  };

  if (loading) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography>Loading user information...</Typography>
      </Box>
    );
  }

  if (!userInfo) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">
          No user information found. Please log in again.
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, maxWidth: 800, mx: 'auto' }}>
      {/* Header */}
      <Box sx={{ mb: 4, textAlign: 'center' }}>
        <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold', color: 'primary.main' }}>
          User Profile
        </Typography>
        <Typography variant="body1" color="textSecondary">
          View and manage your account information
        </Typography>
      </Box>

      {/* Main Profile Card */}
      <Card sx={{ mb: 3, boxShadow: 3 }}>
        <CardContent sx={{ p: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Avatar
                sx={{
                  width: 80,
                  height: 80,
                  bgcolor: 'primary.main',
                  fontSize: '2rem',
                  mr: 3
                }}
              >
                {userInfo.username ? userInfo.username.charAt(0).toUpperCase() : 
                 userInfo.email ? userInfo.email.charAt(0).toUpperCase() : 'U'}
              </Avatar>
              <Box>
                <Typography variant="h5" sx={{ fontWeight: 'bold', mb: 1 }}>
                  {userInfo.username || userInfo.email}
                </Typography>
                <Chip
                  icon={<SecurityIcon />}
                  label={getRoleLabel(userInfo.role)}
                  color={getRoleColor(userInfo.role)}
                  variant="outlined"
                  size="medium"
                />
              </Box>
            </Box>
            <Button
              variant="outlined"
              startIcon={<EditIcon />}
              onClick={handleEditClick}
              sx={{ borderRadius: 2 }}
            >
              Edit Profile
            </Button>
          </Box>

          <Divider sx={{ my: 3 }} />

          {/* User Details Grid */}
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 3, height: '100%', textAlign: 'center' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 2 }}>
                  <EmailIcon sx={{ mr: 2, color: 'primary.main' }} />
                  <Typography variant="h6">Email Address</Typography>
                </Box>
                <Typography variant="body1" color="textSecondary">
                  {userInfo.email || 'Not provided'}
                </Typography>
              </Paper>
            </Grid>

            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 3, height: '100%', textAlign: 'center' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 2 }}>
                  <PersonIcon sx={{ mr: 2, color: 'primary.main' }} />
                  <Typography variant="h6">Username</Typography>
                </Box>
                <Typography variant="body1" color="textSecondary">
                  {userInfo.username || 'Not provided'}
                </Typography>
              </Paper>
            </Grid>

            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 3, height: '100%', textAlign: 'center' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 2 }}>
                  <BusinessIcon sx={{ mr: 2, color: 'primary.main' }} />
                  <Typography variant="h6">Account ID</Typography>
                </Box>
                <Typography variant="body1" color="textSecondary">
                  {userInfo.id || 'Not available'}
                </Typography>
              </Paper>
            </Grid>

            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 3, height: '100%', textAlign: 'center' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 2 }}>
                  <CalendarIcon sx={{ mr: 2, color: 'primary.main' }} />
                  <Typography variant="h6">Account Status</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                  <Chip
                    label={userInfo.is_active ? 'Active' : 'Inactive'}
                    color={userInfo.is_active ? 'success' : 'error'}
                    size="small"
                  />
                </Box>
              </Paper>
            </Grid>

            {(userInfo.first_name || userInfo.last_name) && (
              <Grid item xs={12} md={6}>
                <Paper sx={{ p: 3, height: '100%', textAlign: 'center' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 2 }}>
                    <PersonIcon sx={{ mr: 2, color: 'primary.main' }} />
                    <Typography variant="h6">Full Name</Typography>
                  </Box>
                  <Typography variant="body1" color="textSecondary">
                    {`${userInfo.first_name || ''} ${userInfo.last_name || ''}`.trim() || 'Not provided'}
                  </Typography>
                </Paper>
              </Grid>
            )}

            {userInfo.phone && (
              <Grid item xs={12} md={6}>
                <Paper sx={{ p: 3, height: '100%', textAlign: 'center' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 2 }}>
                    <BusinessIcon sx={{ mr: 2, color: 'primary.main' }} />
                    <Typography variant="h6">Phone</Typography>
                  </Box>
                  <Typography variant="body1" color="textSecondary">
                    {userInfo.phone || 'Not provided'}
                  </Typography>
                </Paper>
              </Grid>
            )}

            {userInfo.url_site && (
              <Grid item xs={12} md={6}>
                <Paper sx={{ p: 3, height: '100%', textAlign: 'center' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 2 }}>
                    <BusinessIcon sx={{ mr: 2, color: 'primary.main' }} />
                    <Typography variant="h6">Website</Typography>
                  </Box>
                  <Typography variant="body1" color="textSecondary">
                    {userInfo.url_site || 'Not provided'}
                  </Typography>
                </Paper>
              </Grid>
            )}
          </Grid>
        </CardContent>
      </Card>

      {/* Actions */}
      <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
        <Button
          variant="outlined"
          color="primary"
          onClick={() => window.location.reload()}
        >
          Refresh Data
        </Button>
        <Button
          variant="contained"
          color="error"
          onClick={clearStorage}
        >
          Clear Session & Logout
        </Button>
      </Box>

      {/* Info Alert */}
      <Alert severity="info" sx={{ mt: 3 }}>
        <Typography variant="body2">
          <strong>Current Session:</strong> You are logged in as {userInfo.email} with {getRoleLabel(userInfo.role)} privileges.
        </Typography>
      </Alert>

      {/* Edit Profile Dialog */}
      <Dialog 
        open={editDialogOpen} 
        onClose={handleCloseEditDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <EditIcon color="primary" />
            Edit Profile
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Username"
                  value={editForm.username}
                  onChange={(e) => handleInputChange('username', e.target.value)}
                  margin="normal"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Email"
                  type="email"
                  value={editForm.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  margin="normal"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="First Name"
                  value={editForm.first_name}
                  onChange={(e) => handleInputChange('first_name', e.target.value)}
                  margin="normal"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Last Name"
                  value={editForm.last_name}
                  onChange={(e) => handleInputChange('last_name', e.target.value)}
                  margin="normal"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Phone"
                  value={editForm.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  margin="normal"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Website"
                  value={editForm.url_site}
                  onChange={(e) => handleInputChange('url_site', e.target.value)}
                  margin="normal"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  select
                  fullWidth
                  label="Role"
                  value={editForm.role}
                  onChange={(e) => handleInputChange('role', e.target.value)}
                  margin="normal"
                  required
                >
                  <MenuItem value="customer">Customer</MenuItem>
                  <MenuItem value="admin">Admin</MenuItem>
                  <MenuItem value="user">User</MenuItem>
                </TextField>
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseEditDialog} disabled={saving}>
            Cancel
          </Button>
          <Button 
            onClick={handleSaveChanges} 
            variant="contained" 
            disabled={saving}
            startIcon={saving ? null : <SaveIcon />}
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert 
          onClose={() => setSnackbar({ ...snackbar, open: false })} 
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default UserInfo; 