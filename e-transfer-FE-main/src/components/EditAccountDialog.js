import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Grid,
  MenuItem,
  InputAdornment,
  IconButton,
  Alert,
  CircularProgress
} from '@mui/material';
import {
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  AccountCircle as AccountCircleIcon,
  Lock as LockIcon,
  Person as PersonIcon,
  Language as LanguageIcon,
  Email as EmailIcon
} from '@mui/icons-material';
import { accountService } from '../services/authService';

const EditAccountDialog = ({ open, accountId, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    email: '',
    username: '',
    password: '',
    first_name: '',
    last_name: '',
    url_site: '',
    role: 'customer'
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (!open) return;
    const fetchAccount = async () => {
      setLoading(true);
      setError('');
      try {
        const response = await accountService.getAccountById(accountId);
        if (response && response.data) {
          setFormData({
            email: response.data.email || '',
            username: response.data.username || '',
            password: '', // Don't load password
            first_name: response.data.first_name || '',
            last_name: response.data.last_name || '',
            url_site: response.data.url_site || '',
            role: response.data.role || 'customer'
          });
        } else {
          setError('Account not found.');
        }
      } catch (err) {
        setError(err.message || 'Failed to load account data.');
      } finally {
        setLoading(false);
      }
    };
    if (accountId) fetchAccount();
  }, [accountId, open]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (error) setError('');
  };

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validateForm = () => {
    if (!formData.email || !validateEmail(formData.email)) {
      setError('Please enter a valid email address.');
      return false;
    }
    if (!formData.username || formData.username.length < 3) {
      setError('Username must be at least 3 characters long.');
      return false;
    }
    if (formData.password && formData.password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return false;
    }
    if (!formData.first_name || !formData.last_name) {
      setError('First name and last name are required.');
      return false;
    }
    if (formData.url_site && !formData.url_site.startsWith('http')) {
      setError('Website URL must start with http:// or https://');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setUpdating(true);
    setError('');
    setSuccess(false);
    if (!validateForm()) {
      setUpdating(false);
      return;
    }
    try {
      // Nếu password rỗng thì không gửi lên
      const { password, ...rest } = formData;
      const updateData = password ? { ...rest, password } : rest;
      const response = await accountService.updateAccount(accountId, updateData);
      if (response.success) {
        setSuccess(true);
        setTimeout(() => {
          if (onSuccess) onSuccess();
          if (onClose) onClose();
        }, 1200);
      } else {
        setError(response.message || 'Account update failed. Please try again.');
      }
    } catch (error) {
      setError(error.message || 'Account update failed. Please try again.');
    } finally {
      setUpdating(false);
    }
  };

  const togglePasswordVisibility = () => setShowPassword(!showPassword);

  const handleDialogClose = () => {
    setFormData({
      email: '', username: '', password: '', first_name: '', last_name: '', url_site: '', role: 'customer'
    });
    setError('');
    setSuccess(false);
    setShowPassword(false);
    if (onClose) onClose();
  };

  return (
    <Dialog open={open} onClose={handleDialogClose} maxWidth="md" fullWidth>
      <DialogTitle>Edit Account</DialogTitle>
      <DialogContent>
        {loading ? (
          <Grid container justifyContent="center" alignItems="center" style={{ minHeight: 200 }}>
            <CircularProgress />
          </Grid>
        ) : (
          <form onSubmit={handleSubmit}>
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
            {success && <Alert severity="success" sx={{ mb: 2 }}>Account updated successfully!</Alert>}
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  margin="normal"
                  required
                  autoComplete="email"
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <EmailIcon color="primary" />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Username"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  margin="normal"
                  required
                  autoComplete="username"
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <AccountCircleIcon color="primary" />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="First Name"
                  name="first_name"
                  value={formData.first_name}
                  onChange={handleChange}
                  margin="normal"
                  required
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <PersonIcon color="primary" />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Last Name"
                  name="last_name"
                  value={formData.last_name}
                  onChange={handleChange}
                  margin="normal"
                  required
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <PersonIcon color="primary" />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Website URL (Optional)"
                  name="url_site"
                  type="url"
                  value={formData.url_site}
                  onChange={handleChange}
                  margin="normal"
                  placeholder="https://example.com"
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <LanguageIcon color="primary" />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Password (leave blank to keep current)"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={handleChange}
                  margin="normal"
                  autoComplete="new-password"
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <LockIcon color="primary" />
                      </InputAdornment>
                    ),
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          onClick={togglePasswordVisibility}
                          edge="end"
                          sx={{ color: 'primary.main' }}
                        >
                          {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  select
                  fullWidth
                  label="Role"
                  name="role"
                  value={formData.role}
                  onChange={handleChange}
                  margin="normal"
                  required
                >
                  <MenuItem value="customer">Customer</MenuItem>
                  <MenuItem value="admin">Admin</MenuItem>
                </TextField>
              </Grid>
            </Grid>
          </form>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleDialogClose} color="secondary" variant="outlined" disabled={updating}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} variant="contained" disabled={updating || loading}>
          {updating ? 'Saving...' : 'Save Changes'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default EditAccountDialog; 