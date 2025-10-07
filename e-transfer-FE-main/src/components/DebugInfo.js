import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material';
import {
  BugReport as BugReportIcon,
  ExpandMore as ExpandMoreIcon
} from '@mui/icons-material';

const DebugInfo = ({ orders, loading, error }) => {
  if (!process.env.NODE_ENV === 'development') {
    return null;
  }

  return (
    <Card sx={{ mb: 2, backgroundColor: '#f5f5f5' }}>
      <CardContent>
        <Box display="flex" alignItems="center" gap={1} mb={2}>
          <BugReportIcon color="warning" />
          <Typography variant="h6">
            Debug Information
          </Typography>
        </Box>

        <Box display="flex" gap={1} mb={2}>
          <Chip 
            label={`Loading: ${loading}`} 
            color={loading ? 'warning' : 'default'}
            size="small"
          />
          <Chip 
            label={`Is Array: ${Array.isArray(orders)}`} 
            color={Array.isArray(orders) ? 'success' : 'error'}
            size="small"
          />
          <Chip 
            label={`Length: ${Array.isArray(orders) ? orders.length : 'N/A'}`} 
            color="primary"
            size="small"
          />
        </Box>

        {error && (
          <Box mb={2}>
            <Typography variant="subtitle2" color="error" gutterBottom>
              Error:
            </Typography>
            <Typography variant="body2" color="error">
              {error.toString()}
            </Typography>
          </Box>
        )}

        <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="subtitle2">
              Raw Data (First 3 items)
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Box component="pre" sx={{ 
              fontSize: '12px', 
              overflow: 'auto', 
              maxHeight: '200px',
              backgroundColor: '#fff',
              padding: 1,
              borderRadius: 1
            }}>
              {Array.isArray(orders) 
                ? JSON.stringify(orders.slice(0, 3), null, 2)
                : JSON.stringify(orders, null, 2)
              }
            </Box>
          </AccordionDetails>
        </Accordion>
      </CardContent>
    </Card>
  );
};

export default DebugInfo; 