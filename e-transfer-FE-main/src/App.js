import React, { useState, useEffect } from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import AdminLayout from './components/AdminLayout';
import TabNavigation from './components/TabNavigation';
import Login from './components/Login';
import Register from './components/Register';

// Create custom theme for admin dashboard
const theme = createTheme({
  palette: {
    primary: {
      main: '#667eea',
    },
    secondary: {
      main: '#764ba2',
    },
    background: {
      default: '#f8fafc',
    },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h4: {
      fontWeight: 700,
    },
    h6: {
      fontWeight: 600,
    },
  },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
          borderRadius: 12,
          border: '1px solid rgba(0, 0, 0, 0.05)',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 12,
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          textTransform: 'none',
          fontWeight: 600,
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 8,
        },
      },
    },
  },
});

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState(null);
  const [authMode, setAuthMode] = useState('login'); // 'login' or 'register'
  const [activeTab, setActiveTab] = useState(0);

  useEffect(() => {
    // Check if user is logged in on app start
    const checkAuthStatus = () => {
      const isLoggedInStorage = localStorage.getItem('isLoggedIn');
      const userStorage = localStorage.getItem('user');
      
      if (isLoggedInStorage === 'true' && userStorage) {
        try {
          const userData = JSON.parse(userStorage);
          setIsLoggedIn(true);
          setUser(userData);
        } catch (error) {
          console.error('Error parsing user data:', error);
          localStorage.removeItem('isLoggedIn');
          localStorage.removeItem('user');
          localStorage.removeItem('token');
        }
      }
    };

    checkAuthStatus();
  }, []);

  const handleLogin = (userData) => {
    setIsLoggedIn(true);
    setUser(userData);
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setUser(null);
    setActiveTab(0);
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('user');
    localStorage.removeItem('token');
  };

  const handleAuthModeChange = (mode) => {
    setAuthMode(mode);
  };

  const handleRegisterSuccess = (userData) => {
    setIsLoggedIn(true);
    setUser(userData);
  };

  const handleTabChange = (newTab) => {
    setActiveTab(newTab);
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <div className="App">
        {isLoggedIn ? (
          <AdminLayout 
            user={user} 
            onLogout={handleLogout}
            activeTab={activeTab}
            onTabChange={handleTabChange}
          >
            <TabNavigation user={user} activeTab={activeTab} />
          </AdminLayout>
        ) : (
          <div>
            {authMode === 'login' ? (
              <Login 
                onLogin={handleLogin} 
                onNavigate={handleAuthModeChange} 
              />
            ) : (
              <Register 
                onRegisterSuccess={handleRegisterSuccess} 
                onSwitchToLogin={() => handleAuthModeChange('login')} 
              />
            )}
          </div>
        )}
      </div>
    </ThemeProvider>
  );
}

export default App;
