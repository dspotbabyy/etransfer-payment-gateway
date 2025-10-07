import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Grid,
  Chip,
  Avatar,
  Divider,
  CircularProgress,
  Alert
} from '@mui/material';
import {
  Person as PersonIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  AccountCircle as AccountIcon,
  CalendarToday as CalendarIcon
} from '@mui/icons-material';
import { userService } from '../services/userService';

const UserDetailDialog = ({ open, userId, onClose }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open || !userId) return;

    const fetchUserDetail = async () => {
      setLoading(true);
      setError('');
      try {
        const response = await userService.getUserById(userId);
        if (response.success && response.data) {
          setUser(response.data);
        } else {
          setError(response.message || 'Failed to load user details');
        }
      } catch (err) {
        setError(err.message || 'Failed to load user details');
      } finally {
        setLoading(false);
      }
    };

    fetchUserDetail();
  }, [open, userId]);

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
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

  if (loading) {
    return (
      <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
        <DialogTitle>User Details</DialogTitle>
        <DialogContent>
          <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
            <CircularProgress />
          </Box>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>User Details</DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {user && (
          <Box>
            {/* User Header */}
            <Box display="flex" alignItems="center" mb={3}>
              <Avatar
                sx={{ width: 80, height: 80, bgcolor: 'primary.main', fontSize: '2rem', mr: 3 }}
              >
                {(user.first_name && user.first_name.charAt(0).toUpperCase()) ||
                 (user.username && user.username.charAt(0).toUpperCase()) ||
                 'U'}
              </Avatar>
              <Box>
                <Typography variant="h5" fontWeight="bold">
                  {user.first_name} {user.last_name}
                </Typography>
                <Typography variant="body1" color="textSecondary">
                  @{user.username}
                </Typography>
                <Box display="flex" gap={1} mt={1}>
                  <Chip
                    label={user.role}
                    color={getRoleColor(user.role)}
                    size="small"
                    sx={{ textTransform: 'capitalize' }}
                  />
                  <Chip
                    label={user.status || 'active'}
                    color={getStatusColor(user.status)}
                    size="small"
                    sx={{ textTransform: 'capitalize' }}
                  />
                </Box>
              </Box>
            </Box>

            <Divider sx={{ mb: 3 }} />

            {/* User Information */}
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Typography variant="h6" fontWeight="bold" mb={2}>
                  Personal Information
                </Typography>
                
                <Box display="flex" alignItems="center" mb={2}>
                  <PersonIcon sx={{ mr: 2, color: 'primary.main' }} />
                  <Box>
                    <Typography variant="body2" color="textSecondary">
                      Full Name
                    </Typography>
                    <Typography variant="body1">
                      {user.first_name} {user.last_name}
                    </Typography>
                  </Box>
                </Box>

                <Box display="flex" alignItems="center" mb={2}>
                  <AccountIcon sx={{ mr: 2, color: 'primary.main' }} />
                  <Box>
                    <Typography variant="body2" color="textSecondary">
                      Username
                    </Typography>
                    <Typography variant="body1">
                      {user.username}
                    </Typography>
                  </Box>
                </Box>

                <Box display="flex" alignItems="center" mb={2}>
                  <EmailIcon sx={{ mr: 2, color: 'primary.main' }} />
                  <Box>
                    <Typography variant="body2" color="textSecondary">
                      Email Address
                    </Typography>
                    <Typography variant="body1">
                      {user.email}
                    </Typography>
                  </Box>
                </Box>

                <Box display="flex" alignItems="center" mb={2}>
                  <PhoneIcon sx={{ mr: 2, color: 'primary.main' }} />
                  <Box>
                    <Typography variant="body2" color="textSecondary">
                      Phone Number
                    </Typography>
                    <Typography variant="body1">
                      {user.phone || 'Not provided'}
                    </Typography>
                  </Box>
                </Box>
              </Grid>

              <Grid item xs={12} md={6}>
                <Typography variant="h6" fontWeight="bold" mb={2}>
                  Account Information
                </Typography>

                <Box display="flex" alignItems="center" mb={2}>
                  <CalendarIcon sx={{ mr: 2, color: 'primary.main' }} />
                  <Box>
                    <Typography variant="body2" color="textSecondary">
                      Created Date
                    </Typography>
                    <Typography variant="body1">
                      {formatDate(user.created_at)}
                    </Typography>
                  </Box>
                </Box>

                <Box display="flex" alignItems="center" mb={2}>
                  <CalendarIcon sx={{ mr: 2, color: 'primary.main' }} />
                  <Box>
                    <Typography variant="body2" color="textSecondary">
                      Last Updated
                    </Typography>
                    <Typography variant="body1">
                      {formatDate(user.updated_at)}
                    </Typography>
                  </Box>
                </Box>

                <Box display="flex" alignItems="center" mb={2}>
                  <PersonIcon sx={{ mr: 2, color: 'primary.main' }} />
                  <Box>
                    <Typography variant="body2" color="textSecondary">
                      User ID
                    </Typography>
                    <Typography variant="body1">
                      {user.id}
                    </Typography>
                  </Box>
                </Box>

                <Box display="flex" alignItems="center" mb={2}>
                  <AccountIcon sx={{ mr: 2, color: 'primary.main' }} />
                  <Box>
                    <Typography variant="body2" color="textSecondary">
                      Account Status
                    </Typography>
                    <Chip
                      label={user.status || 'active'}
                      color={getStatusColor(user.status)}
                      size="small"
                      sx={{ textTransform: 'capitalize' }}
                    />
                  </Box>
                </Box>
              </Grid>
            </Grid>

            {/* Additional Information */}
            {user.url_site && (
              <>
                <Divider sx={{ my: 3 }} />
                <Typography variant="h6" fontWeight="bold" mb={2}>
                  Additional Information
                </Typography>
                <Box display="flex" alignItems="center" mb={2}>
                  <Typography variant="body2" color="textSecondary" sx={{ mr: 2 }}>
                    Website:
                  </Typography>
                  <Typography variant="body1">
                    {user.url_site}
                  </Typography>
                </Box>
              </>
            )}
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default UserDetailDialog; 