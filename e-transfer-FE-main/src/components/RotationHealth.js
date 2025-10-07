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
  Chip,
  IconButton,
  Tooltip,
  Alert,
  LinearProgress
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  CheckCircle as ActiveIcon,
  Cancel as InactiveIcon
} from '@mui/icons-material';
import axios from 'axios';

const RotationHealth = () => {
  const [emailAliases, setEmailAliases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  const fetchEmailAliases = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:3000/api/rotation-health', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      setEmailAliases(response.data);
      setLastUpdated(new Date());
      setError(null);
    } catch (err) {
      setError('Failed to fetch email alias rotation health data');
      console.error('Error fetching email aliases:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmailAliases();
  }, []);

  const formatCurrency = (cents) => {
    return new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: 'CAD'
    }).format(cents / 100);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleString('en-CA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getUsagePercentage = (used, cap) => {
    if (cap === 0) return 0;
    return Math.min((used / cap) * 100, 100);
  };

  const getUsageColor = (percentage) => {
    if (percentage >= 90) return 'error';
    if (percentage >= 70) return 'warning';
    return 'success';
  };

  const formatCoolOffTime = (minutes) => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 700 }}>
          Email Alias Rotation Health
        </Typography>
        <Tooltip title="Refresh data">
          <IconButton onClick={fetchEmailAliases} disabled={loading}>
            <RefreshIcon />
          </IconButton>
        </Tooltip>
      </Box>

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
              <TableCell>Alias Email</TableCell>
              <TableCell>Bank</TableCell>
              <TableCell align="center">Daily Usage</TableCell>
              <TableCell align="right">Daily Total</TableCell>
              <TableCell align="right">Daily Cap</TableCell>
              <TableCell align="center">Cool-off</TableCell>
              <TableCell>Last Used</TableCell>
              <TableCell align="center">Status</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {emailAliases.length === 0 && !loading ? (
              <TableRow>
                <TableCell colSpan={8} align="center">
                  <Typography color="text.secondary">
                    No email aliases found
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              emailAliases.map((alias, index) => {
                const usagePercentage = getUsagePercentage(alias.daily_total_cents, alias.daily_cap_cents);
                return (
                  <TableRow
                    key={alias.alias_email || index}
                    sx={{
                      '&:last-child td, &:last-child th': { border: 0 },
                      backgroundColor: alias.active ? 'inherit' : 'action.hover'
                    }}
                  >
                    <TableCell>
                      <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                        {alias.alias_email}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={alias.bank_slug}
                        variant="outlined"
                        size="small"
                        sx={{ textTransform: 'uppercase' }}
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <LinearProgress
                          variant="determinate"
                          value={usagePercentage}
                          color={getUsageColor(usagePercentage)}
                          sx={{ width: 60, height: 8, borderRadius: 4 }}
                        />
                        <Typography variant="body2" sx={{ minWidth: 40 }}>
                          {usagePercentage.toFixed(0)}%
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {formatCurrency(alias.daily_total_cents)}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2">
                        {formatCurrency(alias.daily_cap_cents)}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Typography variant="body2">
                        {formatCoolOffTime(alias.cool_off_minutes)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {formatDate(alias.last_used_at)}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Tooltip title={alias.active ? 'Active' : 'Inactive'}>
                        {alias.active ? (
                          <ActiveIcon color="success" />
                        ) : (
                          <InactiveIcon color="error" />
                        )}
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {emailAliases.length > 0 && (
        <Box sx={{ mt: 3, p: 2, bgcolor: 'background.paper', borderRadius: 1 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Summary
          </Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 2 }}>
            <Box>
              <Typography variant="body2" color="text.secondary">
                Total Aliases
              </Typography>
              <Typography variant="h6">
                {emailAliases.length}
              </Typography>
            </Box>
            <Box>
              <Typography variant="body2" color="text.secondary">
                Active Aliases
              </Typography>
              <Typography variant="h6" color="success.main">
                {emailAliases.filter(alias => alias.active).length}
              </Typography>
            </Box>
            <Box>
              <Typography variant="body2" color="text.secondary">
                High Usage (>70%)
              </Typography>
              <Typography variant="h6" color="warning.main">
                {emailAliases.filter(alias =>
                  getUsagePercentage(alias.daily_total_cents, alias.daily_cap_cents) > 70
                ).length}
              </Typography>
            </Box>
            <Box>
              <Typography variant="body2" color="text.secondary">
                Total Daily Volume
              </Typography>
              <Typography variant="h6">
                {formatCurrency(
                  emailAliases.reduce((sum, alias) => sum + alias.daily_total_cents, 0)
                )}
              </Typography>
            </Box>
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default RotationHealth;