const express = require('express');
const router = express.Router();
const BankAccount = require('../models/BankAccount');

// 1. API to create new account
router.post('/register', async (req, res) => {
  try {
    const { email, username, password, first_name, last_name, url_site, role } = req.body;
    
    // Validation
    if (!email || !username || !password || !role) {
      return res.status(400).json({
        success: false,
        message: 'Missing required information: email, username, password, role'
      });
    }

    // Validate role
    if (!['admin', 'customer'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Role must be either "admin" or "customer"'
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email format'
      });
    }

    // Validate password length
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long'
      });
    }

    // Check if email already exists
    const existingEmail = await BankAccount.findByEmail(email);
    if (existingEmail) {
      return res.status(400).json({
        success: false,
        message: 'Email already exists'
      });
    }

    // Check if username already exists
    const existingUsername = await BankAccount.findByUsername(username);
    if (existingUsername) {
      return res.status(400).json({
        success: false,
        message: 'Username already exists'
      });
    }

    // Create new account
    const newAccount = await BankAccount.create({
      email,
      username,
      password,
      first_name: first_name || null,
      last_name: last_name || null,
      url_site: url_site || null,
      role
    });

    res.status(201).json({
      success: true,
      message: 'Account created successfully',
      data: newAccount
    });

  } catch (error) {
    console.error('Error creating account:', error);
    res.status(500).json({
      success: false,
      message: 'Server error when creating account'
    });
  }
});

// 2. API to login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Validation
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Missing required information: email, password'
      });
    }

    // Authenticate user
    const account = await BankAccount.authenticate(email, password);
    
    if (!account) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    res.json({
      success: true,
      message: 'Login successful',
      data: account
    });

  } catch (error) {
    console.error('Error during login:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during login'
    });
  }
});

// 3. API to update account
router.put('/accounts/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { email, username, password, first_name, last_name, url_site, role } = req.body;
    
    // Validation
    if (!email || !username || !role) {
      return res.status(400).json({
        success: false,
        message: 'Missing required information: email, username, role'
      });
    }

    // Validate role
    if (!['admin', 'customer'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Role must be either "admin" or "customer"'
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email format'
      });
    }

    // Validate password length if provided
    if (password && password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long'
      });
    }

    // Check if account exists
    const existingAccount = await BankAccount.getById(id);
    if (!existingAccount) {
      return res.status(404).json({
        success: false,
        message: 'Account not found'
      });
    }

    // Check if email already exists (excluding current account)
    const existingEmail = await BankAccount.findByEmail(email);
    if (existingEmail && existingEmail.id !== parseInt(id)) {
      return res.status(400).json({
        success: false,
        message: 'Email already exists'
      });
    }

    // Check if username already exists (excluding current account)
    const existingUsername = await BankAccount.findByUsername(username);
    if (existingUsername && existingUsername.id !== parseInt(id)) {
      return res.status(400).json({
        success: false,
        message: 'Username already exists'
      });
    }

    // Update account
    const updatedAccount = await BankAccount.update(id, {
      email,
      username,
      password: password || null,
      first_name: first_name || null,
      last_name: last_name || null,
      url_site: url_site || null,
      role
    });

    res.json({
      success: true,
      message: 'Account updated successfully',
      data: updatedAccount
    });

  } catch (error) {
    console.error('Error updating account:', error);
    res.status(500).json({
      success: false,
      message: 'Server error when updating account'
    });
  }
});

// 4. API to get all accounts (admin only)
router.get('/accounts', async (req, res) => {
  try {
    const accounts = await BankAccount.getAll();
    
    res.json({
      success: true,
      message: 'Accounts list retrieved successfully',
      data: accounts,
      total: accounts.length
    });

  } catch (error) {
    console.error('Error getting accounts list:', error);
    res.status(500).json({
      success: false,
      message: 'Server error when getting accounts list'
    });
  }
});

// 5. API to get account by ID
router.get('/accounts/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const account = await BankAccount.getById(id);
    
    if (!account) {
      return res.status(404).json({
        success: false,
        message: 'Account not found'
      });
    }

    res.json({
      success: true,
      message: 'Account information retrieved successfully',
      data: account
    });

  } catch (error) {
    console.error('Error getting account:', error);
    res.status(500).json({
      success: false,
      message: 'Server error when getting account'
    });
  }
});

module.exports = router; 