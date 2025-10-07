import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Grid,
  Typography,
  CircularProgress,
  Box
} from '@mui/material';
import { accountService } from '../services/authService';

const AccountDetailDialog = ({ open, accountId, onClose }) => {
  const [account, setAccount] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    const fetchAccount = async () => {
      setLoading(true);
      setError('');
      try {
        const response = await accountService.getAccountById(accountId);
        if (response && response.data) {
          setAccount(response.data);
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

  const renderField = (label, value) => (
    <Box mb={2}>
      <Typography variant="subtitle2" color="text.secondary">{label}</Typography>
      <Typography variant="body1" fontWeight={500}>{value || 'N/A'}</Typography>
    </Box>
  );

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Account Details</DialogTitle>
      <DialogContent>
        {loading ? (
          <Grid container justifyContent="center" alignItems="center" style={{ minHeight: 200 }}>
            <CircularProgress />
          </Grid>
        ) : error ? (
          <Typography color="error" sx={{ my: 3 }}>{error}</Typography>
        ) : (
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              {renderField('Email', account.email)}
              {renderField('Username', account.username)}
              {renderField('First Name', account.first_name)}
              {renderField('Last Name', account.last_name)}
            </Grid>
            <Grid item xs={12} sm={6}>
              {renderField('Website URL', account.url_site)}
              {renderField('Role', account.role)}
              {renderField('Created Date', account.create_date ? new Date(account.create_date).toLocaleString() : '')}
            </Grid>
          </Grid>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} variant="outlined">Close</Button>
      </DialogActions>
    </Dialog>
  );
};

export default AccountDetailDialog; 