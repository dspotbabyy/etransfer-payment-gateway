import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_BASE_URL = 'http://localhost:3000/api';

const ConnectionStatus = () => {
  const [status, setStatus] = useState('checking'); // 'checking', 'connected', 'error'
  const [lastCheck, setLastCheck] = useState(null);

  const checkConnection = async () => {
    try {
      setStatus('checking');
      // Use a working endpoint to check connection
      await axios.get(`${API_BASE_URL}/auth/accounts`, { timeout: 5000 });
      setStatus('connected');
      setLastCheck(new Date());
    } catch (error) {
      setStatus('error');
      setLastCheck(new Date());
    }
  };

  useEffect(() => {
    checkConnection();
    
    // Check connection every 30 seconds
    const interval = setInterval(checkConnection, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const getStatusConfig = () => {
    switch (status) {
      case 'connected':
        return {
          color: 'green',
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200',
          textColor: 'text-green-800',
          iconColor: 'text-green-500',
          icon: (
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          ),
          text: 'API connection successful'
        };
      case 'error':
        return {
          color: 'red',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
          textColor: 'text-red-800',
          iconColor: 'text-red-500',
          icon: (
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          ),
          text: 'Unable to connect to API'
        };
      default:
        return {
          color: 'yellow',
          bgColor: 'bg-yellow-50',
          borderColor: 'border-yellow-200',
          textColor: 'text-yellow-800',
          iconColor: 'text-yellow-500',
          icon: (
            <svg className="w-5 h-5 animate-spin" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
            </svg>
          ),
          text: 'Checking connection...'
        };
    }
  };

  const config = getStatusConfig();

  if (status === 'connected') {
    return (
      <div className="flex items-center gap-3 mb-4">
        <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border ${config.bgColor} ${config.borderColor} ${config.textColor}`}>
          <span className={config.iconColor}>
            {config.icon}
          </span>
          <span className="text-sm font-medium">{config.text}</span>
        </div>
        {lastCheck && (
          <span className="text-xs text-gray-500">
            Updated: {lastCheck.toLocaleTimeString('en-US')}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className={`mb-4 p-4 rounded-lg border ${config.bgColor} ${config.borderColor}`}>
      <div className="flex items-start">
        <div className={`flex-shrink-0 ${config.iconColor}`}>
          {config.icon}
        </div>
        <div className="ml-3 flex-1">
          <h3 className={`text-sm font-medium ${config.textColor}`}>
            {status === 'error' ? 'Connection Error' : 'Checking Connection'}
          </h3>
          <div className={`mt-2 text-sm ${config.textColor}`}>
            <p>{config.text}</p>
            {status === 'error' && (
              <div className="mt-3 space-y-1">
                <p className="font-medium">Please check:</p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>Is the API server running at http://localhost:3000?</li>
                  <li>Is CORS configured correctly?</li>
                  <li>Is the network connection stable?</li>
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConnectionStatus; 