# E-Transfer Frontend

Electronic money transfer management application with modern and user-friendly interface.

## Features

### 🔐 Authentication and Security
- Login/logout through API
- Automatic JWT token management
- Route protection for logged-in users
- Automatic logout when token expires

### 👥 Account Management
- **Account List**: Display all accounts with detailed information
- **Create New Account**: Multi-step form with full validation
- **Edit Account**: Update account information
- **Delete Account**: Delete account with confirmation
- **Activate/Deactivate**: Enable/disable account status
- **Role Management**: Support for User, Manager, Admin roles

### 📊 Dashboard
- Control panel with order statistics
- Visual statistics charts
- Real-time connection status
- System debug information

### 🎨 Interface
- Material-UI with custom theme
- Responsive design for all devices
- Smooth animations and effects
- Dark/Light mode support

## Installation and Setup

### System Requirements
- Node.js 16+ 
- npm or yarn

### Install dependencies
```bash
npm install
```

### Run application
```bash
npm start
```

The application will run at `http://localhost:3001`

### Build for production
```bash
npm run build
```

## API Configuration

The application is configured to connect to backend API at `http://localhost:3000`.

### Main endpoints:
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Get current user information
- `GET /api/accounts` - Get account list
- `POST /api/accounts` - Create new account
- `PUT /api/accounts/:id` - Update account
- `DELETE /api/accounts/:id` - Delete account
- `PATCH /api/accounts/:id/toggle-status` - Toggle status

## Project Structure

```
src/
├── components/          # React components
│   ├── AccountList.js   # Account list
│   ├── CreateAccount.js # Create new account
│   ├── Header.js        # Header with navigation
│   ├── Login.js         # Login form
│   ├── Logout.js        # User menu
│   └── ...
├── services/            # API services
│   ├── authService.js   # Authentication & Account management
│   └── orderService.js  # Order management
├── App.js              # Main component
└── index.js            # Entry point
```

## Key Features

### 1. Form Validation
- Real-time validation for all forms
- Clear and user-friendly error display
- Multi-step validation support

### 2. Error Handling
- Graceful API error handling
- User-friendly error messages
- Automatic retry for some cases

### 3. Loading States
- Loading indicators for all async operations
- Skeleton loading for lists
- Disable buttons when processing

### 4. Responsive Design
- Optimized for desktop, tablet and mobile
- Adaptive navigation menu
- Responsive table with horizontal scroll

## Technologies Used

- **React 19** - UI Framework
- **Material-UI 7** - Component library
- **Axios** - HTTP client
- **React Router** - Client-side routing
- **JWT** - Authentication

## Contributing

1. Fork the project
2. Create feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open Pull Request

## License

MIT License - see LICENSE file for details.
