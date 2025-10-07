import React from 'react';
import { Box } from '@mui/material';

// Tab components
import Dashboard from './Dashboard';
import OrderDashboard from './OrderDashboard';
import AccountList from './AccountList';
import UserInfo from './UserInfo';
import Feed from './Feed';
import RotationHealth from './RotationHealth';
import Unmatched from './Unmatched';
import Blacklist from './Blacklist';

const TabNavigation = ({ user, activeTab = 0 }) => {
  // Get user role from localStorage if not passed as prop
  const currentUser = user || JSON.parse(localStorage.getItem('user') || '{}');
  const isCustomer = currentUser.role === 'customer';

  // Define tabs based on user role
  const tabs = isCustomer ? [
    {
      label: 'Dashboard',
      component: <Dashboard />
    },
    {
      label: 'Orders',
      component: <OrderDashboard />
    },
    {
      label: 'User Info',
      component: <UserInfo />
    }
  ] : [
    {
      label: 'Dashboard',
      component: <Dashboard />
    },
    {
      label: 'Orders',
      component: <OrderDashboard />
    },
    {
      label: 'Accounts',
      component: <AccountList />
    },
    {
      label: 'Feed',
      component: <Feed />
    },
    {
      label: 'Rotation Health',
      component: <RotationHealth />
    },
    {
      label: 'Unmatched',
      component: <Unmatched />
    },
    {
      label: 'Blacklist',
      component: <Blacklist />
    },
    {
      label: 'User Info',
      component: <UserInfo />
    }
  ];

  return (
    <Box sx={{ width: '100%', height: '100%' }}>
      {tabs[activeTab]?.component || tabs[0].component}
    </Box>
  );
};

export default TabNavigation; 