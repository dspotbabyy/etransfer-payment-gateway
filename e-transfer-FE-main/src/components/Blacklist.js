import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  IconButton,
  Tooltip,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  LinearProgress,
  Grid
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  Block as BlockIcon
} from '@mui/icons-material';
import axios from 'axios';

const Blacklist = () => {
  const [blacklistEntries, setBlacklistEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [addDialog, setAddDialog] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState({ open: false, entry: null });
  const [newEntry, setNewEntry] = useState({ type: 'email', value: '', reason: '' });
  const [submitting, setSubmitting] = useState(false);

  const fetchBlacklistEntries = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:3000/api/blacklist', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      setBlacklistEntries(response.data);
      setLastUpdated(new Date());
      setError(null);
    } catch (err) {
      setError('Failed to fetch blacklist entries');
      console.error('Error fetching blacklist:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBlacklistEntries();
  }, []);

  const handleAddClick = () => {
    setAddDialog(true);
    setNewEntry({ type: 'email', value: '', reason: '' });
  };

  const handleAddCancel = () => {
    setAddDialog(false);
    setNewEntry({ type: 'email', value: '', reason: '' });
  };

  const handleAddConfirm = async () => {
    if (!newEntry.value.trim()) {
      return;
    }

    setSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post('http://localhost:3000/api/blacklist', {
        type: newEntry.type,
        value: newEntry.value.trim(),
        reason: newEntry.reason.trim() || 'Manual addition'
      }, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      setBlacklistEntries(prev => [response.data, ...prev]);
      setAddDialog(false);
      setNewEntry({ type: 'email', value: '', reason: '' });
      setError(null);
    } catch (err) {
      setError('Failed to add blacklist entry. Please check the value and try again.');
      console.error('Error adding blacklist entry:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteClick = (entry) => {
    setDeleteDialog({ open: true, entry });
  };

  const handleDeleteCancel = () => {
    setDeleteDialog({ open: false, entry: null });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteDialog.entry) return;

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`http://localhost:3000/api/blacklist/${deleteDialog.entry.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      setBlacklistEntries(prev => prev.filter(entry => entry.id !== deleteDialog.entry.id));
      setDeleteDialog({ open: false, entry: null });
      setError(null);
    } catch (err) {
      setError('Failed to delete blacklist entry');
      console.error('Error deleting blacklist entry:', err);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('en-CA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getTypeColor = (type) => {
    switch (type?.toLowerCase()) {
      case 'email':
        return 'primary';
      case 'phone':
        return 'secondary';
      case 'ip':
        return 'warning';
      default:
        return 'default';
    }
  };

  const getTypeIcon = (type) => {
    return <BlockIcon />;
  };

  const validateValue = (type, value) => {
    switch (type) {
      case 'email':
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
      case 'phone':
        return /^[\d\s\-+()]+$/.test(value) && value.replace(/\D/g, '').length >= 10;
      case 'ip':
        return /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/.test(value);
      default:
        return true;
    }
  };

  const isValidEntry = () => {
    return newEntry.value.trim() && validateValue(newEntry.type, newEntry.value.trim());
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 700 }}>
          Blacklist Management
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleAddClick}
            color="primary"
          >
            Add Entry
          </Button>
          <Tooltip title="Refresh data">
            <IconButton onClick={fetchBlacklistEntries} disabled={loading}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Manage blocked emails, phone numbers, and IP addresses. Blacklisted entries will be automatically blocked from transactions.
      </Typography>

      {lastUpdated && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Last updated: {formatDate(lastUpdated)}
        </Typography>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Box sx={{ mb: 3 }}>
          <LinearProgress />
        </Box>
      ) : null}

      <TableContainer component={Paper} sx={{ boxShadow: 2 }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Type</TableCell>
              <TableCell>Value</TableCell>
              <TableCell>Reason</TableCell>
              <TableCell>Added Date</TableCell>
              <TableCell>Added By</TableCell>
              <TableCell align="center">Action</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {blacklistEntries.length === 0 && !loading ? (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  <Box sx={{ py: 4 }}>
                    <BlockIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                    <Typography color="text.secondary">
                      No blacklist entries found
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Add entries to block suspicious emails, phones, or IPs
                    </Typography>
                  </Box>
                </TableCell>
              </TableRow>
            ) : (
              blacklistEntries.map((entry) => (
                <TableRow
                  key={entry.id}
                  sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
                >
                  <TableCell>
                    <Chip
                      icon={getTypeIcon(entry.type)}
                      label={entry.type.toUpperCase()}
                      color={getTypeColor(entry.type)}
                      size="small"
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontFamily: 'monospace', fontWeight: 600 }}>
                      {entry.value}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {entry.reason || 'No reason provided'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {formatDate(entry.created_at)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {entry.added_by || 'System'}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Tooltip title="Delete entry">
                      <IconButton
                        onClick={() => handleDeleteClick(entry)}
                        color="error"
                        size="small"
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {blacklistEntries.length > 0 && (
        <Box sx={{ mt: 3, p: 2, bgcolor: 'background.paper', borderRadius: 1 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Summary
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={3}>
              <Typography variant="body2" color="text.secondary">
                Total Entries
              </Typography>
              <Typography variant="h6">
                {blacklistEntries.length}
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Typography variant="body2" color="text.secondary">
                Emails
              </Typography>
              <Typography variant="h6" color="primary.main">
                {blacklistEntries.filter(entry => entry.type === 'email').length}
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Typography variant="body2" color="text.secondary">
                Phone Numbers
              </Typography>
              <Typography variant="h6" color="secondary.main">
                {blacklistEntries.filter(entry => entry.type === 'phone').length}
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Typography variant="body2" color="text.secondary">
                IP Addresses
              </Typography>
              <Typography variant="h6" color="warning.main">
                {blacklistEntries.filter(entry => entry.type === 'ip').length}
              </Typography>
            </Grid>
          </Grid>
        </Box>
      )}

      {/* Add Entry Dialog */}
      <Dialog open={addDialog} onClose={handleAddCancel} maxWidth="sm" fullWidth>
        <DialogTitle>
          Add Blacklist Entry
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <FormControl fullWidth sx={{ mb: 3 }}>
              <InputLabel>Type</InputLabel>
              <Select
                value={newEntry.type}
                label="Type"
                onChange={(e) => setNewEntry(prev => ({ ...prev, type: e.target.value }))}
                disabled={submitting}
              >
                <MenuItem value="email">Email Address</MenuItem>
                <MenuItem value="phone">Phone Number</MenuItem>
                <MenuItem value="ip">IP Address</MenuItem>
              </Select>
            </FormControl>

            <TextField
              fullWidth
              label={`${newEntry.type.charAt(0).toUpperCase() + newEntry.type.slice(1)} ${newEntry.type === 'ip' ? 'Address' : newEntry.type === 'phone' ? 'Number' : 'Address'}`}
              value={newEntry.value}
              onChange={(e) => setNewEntry(prev => ({ ...prev, value: e.target.value }))}
              placeholder={
                newEntry.type === 'email' ? 'example@domain.com' :
                newEntry.type === 'phone' ? '+1-555-123-4567' :
                '192.168.1.1'
              }
              error={newEntry.value.trim() && !validateValue(newEntry.type, newEntry.value.trim())}
              helperText={
                newEntry.value.trim() && !validateValue(newEntry.type, newEntry.value.trim()) ?
                `Please enter a valid ${newEntry.type} ${newEntry.type === 'ip' ? 'address' : newEntry.type === 'phone' ? 'number' : 'address'}` :
                ''
              }
              disabled={submitting}
              sx={{ mb: 3 }}
            />

            <TextField
              fullWidth
              label="Reason (Optional)"
              value={newEntry.reason}
              onChange={(e) => setNewEntry(prev => ({ ...prev, reason: e.target.value }))}
              placeholder="Why is this being blacklisted?"
              multiline
              rows={2}
              disabled={submitting}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleAddCancel} disabled={submitting}>
            Cancel
          </Button>
          <Button
            onClick={handleAddConfirm}
            variant="contained"
            disabled={!isValidEntry() || submitting}
          >
            {submitting ? 'Adding...' : 'Add Entry'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialog.open} onClose={handleDeleteCancel}>
        <DialogTitle>
          Confirm Deletion
        </DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to remove this blacklist entry?
          </Typography>
          {deleteDialog.entry && (
            <Box sx={{ mt: 2, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
              <Typography variant="body2">
                <strong>Type:</strong> {deleteDialog.entry.type}
              </Typography>
              <Typography variant="body2">
                <strong>Value:</strong> {deleteDialog.entry.value}
              </Typography>
              <Typography variant="body2">
                <strong>Reason:</strong> {deleteDialog.entry.reason || 'No reason provided'}
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteCancel}>
            Cancel
          </Button>
          <Button onClick={handleDeleteConfirm} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Blacklist;