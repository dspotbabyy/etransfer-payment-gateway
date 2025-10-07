import React from 'react';
import {
  AccountBalance as AccountBalanceIcon,
  Notifications as NotificationsIcon,
  Dashboard as DashboardIcon,
  People as PeopleIcon
} from '@mui/icons-material';
import Logout from './Logout';

const Header = ({ onLogout, user, onNavigate, currentPage }) => {
  const handleNavigation = (page) => {
    onNavigate(page);
  };

  // Lấy role từ prop user hoặc localStorage
  const userRole = user?.role || (() => {
    try {
      const userData = JSON.parse(localStorage.getItem('user'));
      if (userData && userData.role) return userData.role;
    } catch (e) {}
    return 'customer';
  })();

  return (
    <header className="w-full bg-gradient-to-r from-blue-700 to-blue-500 shadow-lg">
      <div className="max-w-7xl mx-auto flex items-center justify-between px-4 py-2">
        {/* Logo + Title */}
        <div className="flex items-center gap-3 select-none">
          <AccountBalanceIcon className="text-white" fontSize="large" />
          <span className="text-white text-xl font-bold tracking-wide hidden md:block">
            E-Transfer Management System
          </span>
        </div>
        {/* Navigation */}
        <nav className="flex items-center gap-3 ml-auto justify-end">
          <button
            className={`flex items-center gap-2 px-4 py-2 rounded-full font-semibold shadow transition-all duration-150 ${
              currentPage === 'dashboard'
                ? 'bg-white text-blue-700'
                : 'bg-blue-600 text-white hover:bg-blue-800'
            } focus:outline-none focus:ring-2 focus:ring-white/50`}
            onClick={() => handleNavigation('dashboard')}
          >
            <DashboardIcon className={currentPage === 'dashboard' ? 'text-blue-700' : 'text-white'} fontSize="small" />
            <span className="hidden sm:inline">Dashboard</span>
          </button>
          {userRole === 'admin' && (
            <button
              className={`flex items-center gap-2 px-4 py-2 rounded-full font-semibold shadow transition-all duration-150 ${
                currentPage === 'accounts'
                  ? 'bg-white text-blue-700'
                  : 'bg-blue-600 text-white hover:bg-blue-800'
              } focus:outline-none focus:ring-2 focus:ring-white/50`}
              onClick={() => handleNavigation('accounts')}
            >
              <PeopleIcon className={currentPage === 'accounts' ? 'text-blue-700' : 'text-white'} fontSize="small" />
              <span className="hidden sm:inline">Accounts</span>
            </button>
          )}
          <button className="relative p-2 bg-blue-600 hover:bg-blue-800 rounded-full transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-white/50 shadow">
            <NotificationsIcon className="text-white" fontSize="small" />
            <span className="absolute -top-1 -right-1 bg-red-500 text-xs text-white rounded-full px-1.5 py-0.5 border-2 border-white shadow-sm min-w-[20px] text-center">
              4
            </span>
          </button>
          <div className="ml-2">
            <Logout onLogout={onLogout} user={user} />
          </div>
        </nav>
      </div>
    </header>
  );
};

export default Header; 