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
  Alert
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  Circle as CircleIcon
} from '@mui/icons-material';
import axios from 'axios';

const Feed = () => {
  const [paymentInstructions, setPaymentInstructions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  const fetchPaymentInstructions = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:3000/api/feed', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      setPaymentInstructions(response.data);
      setLastUpdated(new Date());
      setError(null);
    } catch (err) {
      setError('Failed to fetch payment instructions');
      console.error('Error fetching payment instructions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPaymentInstructions();

    const interval = setInterval(() => {
      fetchPaymentInstructions();
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'pending':
        return 'warning';
      case 'completed':
        return 'success';
      case 'failed':
        return 'error';
      case 'processing':
        return 'info';
      default:
        return 'default';
    }
  };

  const formatAmount = (amount) => {
    return new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: 'CAD'
    }).format(amount / 100);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('en-CA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 700 }}>
          Payment Instructions Feed
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CircleIcon
              sx={{
                color: 'success.main',
                fontSize: 12,
                animation: 'pulse 2s infinite'
              }}
            />
            <Typography variant="body2" color="text.secondary">
              Auto-refreshing every 5s
            </Typography>
          </Box>
          <Tooltip title="Refresh now">
            <IconButton onClick={fetchPaymentInstructions} disabled={loading}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </Box>
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

      <TableContainer component={Paper} sx={{ boxShadow: 2 }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Instruction ID</TableCell>
              <TableCell>Order ID</TableCell>
              <TableCell align="right">Amount</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Created At</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading && paymentInstructions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} align="center">
                  <Typography>Loading...</Typography>
                </TableCell>
              </TableRow>
            ) : paymentInstructions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} align="center">
                  <Typography color="text.secondary">
                    No payment instructions found
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              paymentInstructions.map((instruction) => (
                <TableRow
                  key={instruction.instruction_id}
                  sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
                >
                  <TableCell>
                    <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                      {instruction.instruction_id}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                      {instruction.order_id}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {formatAmount(instruction.amount)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={instruction.status}
                      color={getStatusColor(instruction.status)}
                      size="small"
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {formatDate(instruction.created_at)}
                    </Typography>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <style jsx>{`
        @keyframes pulse {
          0% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
          100% {
            opacity: 1;
          }
        }
      `}</style>
    </Box>
  );
};

export default Feed;