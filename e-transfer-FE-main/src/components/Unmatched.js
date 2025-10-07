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
  Chip,
  LinearProgress
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  Link as LinkIcon,
  Search as SearchIcon
} from '@mui/icons-material';
import axios from 'axios';

const Unmatched = () => {
  const [paymentEvents, setPaymentEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [matchDialog, setMatchDialog] = useState({ open: false, event: null });
  const [instructionId, setInstructionId] = useState('');
  const [matching, setMatching] = useState(false);

  const fetchUnmatchedEvents = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:3000/api/unmatched', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      setPaymentEvents(response.data);
      setLastUpdated(new Date());
      setError(null);
    } catch (err) {
      setError('Failed to fetch unmatched payment events');
      console.error('Error fetching unmatched events:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUnmatchedEvents();
  }, []);

  const handleMatchClick = (event) => {
    setMatchDialog({ open: true, event });
    setInstructionId('');
  };

  const handleMatchCancel = () => {
    setMatchDialog({ open: false, event: null });
    setInstructionId('');
  };

  const handleMatchConfirm = async () => {
    if (!instructionId.trim()) {
      return;
    }

    setMatching(true);
    try {
      const token = localStorage.getItem('token');
      await axios.post('http://localhost:3000/api/unmatched/match', {
        payment_event_id: matchDialog.event.id,
        instruction_id: instructionId.trim()
      }, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      // Remove the matched event from the list
      setPaymentEvents(prev => prev.filter(event => event.id !== matchDialog.event.id));
      setMatchDialog({ open: false, event: null });
      setInstructionId('');
      setError(null);
    } catch (err) {
      setError('Failed to match payment event. Please check the instruction ID and try again.');
      console.error('Error matching payment event:', err);
    } finally {
      setMatching(false);
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

  const getEventTypeColor = (type) => {
    switch (type?.toLowerCase()) {
      case 'deposit':
        return 'success';
      case 'withdrawal':
        return 'warning';
      case 'transfer':
        return 'info';
      default:
        return 'default';
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 700 }}>
          Unmatched Payment Events
        </Typography>
        <Tooltip title="Refresh data">
          <IconButton onClick={fetchUnmatchedEvents} disabled={loading}>
            <RefreshIcon />
          </IconButton>
        </Tooltip>
      </Box>

      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Payment events that don't have matching instruction IDs. Use the match button to manually link them.
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
              <TableCell>Event ID</TableCell>
              <TableCell>Type</TableCell>
              <TableCell align="right">Amount</TableCell>
              <TableCell>Reference</TableCell>
              <TableCell>From/To</TableCell>
              <TableCell>Created At</TableCell>
              <TableCell align="center">Action</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {paymentEvents.length === 0 && !loading ? (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  <Box sx={{ py: 4 }}>
                    <SearchIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                    <Typography color="text.secondary">
                      No unmatched payment events found
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      All payment events have been matched to instructions
                    </Typography>
                  </Box>
                </TableCell>
              </TableRow>
            ) : (
              paymentEvents.map((event) => (
                <TableRow
                  key={event.id}
                  sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
                >
                  <TableCell>
                    <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                      {event.id}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={event.type}
                      color={getEventTypeColor(event.type)}
                      size="small"
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {formatAmount(event.amount)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                      {event.reference || 'N/A'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {event.from_account || event.to_account || 'N/A'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {formatDate(event.created_at)}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<LinkIcon />}
                      onClick={() => handleMatchClick(event)}
                      sx={{ minWidth: 'auto' }}
                    >
                      Match
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {paymentEvents.length > 0 && (
        <Box sx={{ mt: 3, p: 2, bgcolor: 'background.paper', borderRadius: 1 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Summary
          </Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 2 }}>
            <Box>
              <Typography variant="body2" color="text.secondary">
                Unmatched Events
              </Typography>
              <Typography variant="h6" color="warning.main">
                {paymentEvents.length}
              </Typography>
            </Box>
            <Box>
              <Typography variant="body2" color="text.secondary">
                Total Amount
              </Typography>
              <Typography variant="h6">
                {formatAmount(
                  paymentEvents.reduce((sum, event) => sum + event.amount, 0)
                )}
              </Typography>
            </Box>
            <Box>
              <Typography variant="body2" color="text.secondary">
                Oldest Event
              </Typography>
              <Typography variant="h6">
                {paymentEvents.length > 0 ?
                  formatDate(Math.min(...paymentEvents.map(e => new Date(e.created_at)))) :
                  'N/A'
                }
              </Typography>
            </Box>
          </Box>
        </Box>
      )}

      {/* Match Dialog */}
      <Dialog open={matchDialog.open} onClose={handleMatchCancel} maxWidth="sm" fullWidth>
        <DialogTitle>
          Match Payment Event
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Match this payment event to an instruction ID:
          </Typography>

          {matchDialog.event && (
            <Box sx={{ mb: 3, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
              <Typography variant="body2" sx={{ mb: 1 }}>
                <strong>Event ID:</strong> {matchDialog.event.id}
              </Typography>
              <Typography variant="body2" sx={{ mb: 1 }}>
                <strong>Amount:</strong> {formatAmount(matchDialog.event.amount)}
              </Typography>
              <Typography variant="body2" sx={{ mb: 1 }}>
                <strong>Type:</strong> {matchDialog.event.type}
              </Typography>
              <Typography variant="body2">
                <strong>Created:</strong> {formatDate(matchDialog.event.created_at)}
              </Typography>
            </Box>
          )}

          <TextField
            autoFocus
            label="Instruction ID"
            fullWidth
            value={instructionId}
            onChange={(e) => setInstructionId(e.target.value)}
            placeholder="Enter the instruction ID to match"
            disabled={matching}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleMatchCancel} disabled={matching}>
            Cancel
          </Button>
          <Button
            onClick={handleMatchConfirm}
            variant="contained"
            disabled={!instructionId.trim() || matching}
          >
            {matching ? 'Matching...' : 'Match'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Unmatched;