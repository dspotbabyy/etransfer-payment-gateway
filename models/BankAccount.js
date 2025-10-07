const { db } = require('../database');
const bcrypt = require('bcrypt');

class BankAccount {
  // Create new bank account
  static create(accountData) {
    return new Promise(async (resolve, reject) => {
      try {
        const { email, username, password, first_name, last_name, url_site, role } = accountData;
        
        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Check if using PostgreSQL or SQLite
        const isProduction = process.env.NODE_ENV === 'production' || process.env.RENDER === 'true';
        
        let sql;
        if (isProduction && process.env.DATABASE_URL) {
          // PostgreSQL - return the inserted row
          sql = `
            INSERT INTO bank_accounts (email, username, password, first_name, last_name, url_site, role)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            RETURNING id, email, username, first_name, last_name, url_site, role, create_date
          `;
        } else {
          // SQLite
          sql = `
            INSERT INTO bank_accounts (email, username, password, first_name, last_name, url_site, role)
            VALUES (?, ?, ?, ?, ?, ?, ?)
          `;
        }
        
        db.run(sql, [email, username, hashedPassword, first_name, last_name, url_site, role], function(err) {
          if (err) {
            reject(err);
          } else {
            if (isProduction && process.env.DATABASE_URL) {
              // PostgreSQL - result is in the callback result
              resolve({
                id: this.lastID || 'generated',
                email,
                username,
                first_name,
                last_name,
                url_site,
                role,
                create_date: new Date().toISOString()
              });
            } else {
              // SQLite
              resolve({
                id: this.lastID,
                email,
                username,
                first_name,
                last_name,
                url_site,
                role,
                create_date: new Date().toISOString()
              });
            }
          }
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  // Update account
  static update(id, updateData) {
    return new Promise(async (resolve, reject) => {
      try {
        const { email, username, password, first_name, last_name, url_site, role } = updateData;
        
        // Check if using PostgreSQL or SQLite
        const isProduction = process.env.NODE_ENV === 'production' || process.env.RENDER === 'true';
        
        let sql, params;
        
        if (password) {
          // Update with password
          const hashedPassword = await bcrypt.hash(password, 10);
          if (isProduction && process.env.DATABASE_URL) {
            // PostgreSQL with RETURNING clause
            sql = `
              UPDATE bank_accounts 
              SET email = ?, username = ?, password = ?, first_name = ?, last_name = ?, url_site = ?, role = ?
              WHERE id = ?
              RETURNING id, email, username, first_name, last_name, url_site, role, create_date
            `;
          } else {
            // SQLite
            sql = `
              UPDATE bank_accounts 
              SET email = ?, username = ?, password = ?, first_name = ?, last_name = ?, url_site = ?, role = ?
              WHERE id = ?
            `;
          }
          params = [email, username, hashedPassword, first_name, last_name, url_site, role, id];
        } else {
          // Update without password
          if (isProduction && process.env.DATABASE_URL) {
            // PostgreSQL with RETURNING clause
            sql = `
              UPDATE bank_accounts 
              SET email = ?, username = ?, first_name = ?, last_name = ?, url_site = ?, role = ?
              WHERE id = ?
              RETURNING id, email, username, first_name, last_name, url_site, role, create_date
            `;
          } else {
            // SQLite
            sql = `
              UPDATE bank_accounts 
              SET email = ?, username = ?, first_name = ?, last_name = ?, url_site = ?, role = ?
              WHERE id = ?
            `;
          }
          params = [email, username, first_name, last_name, url_site, role, id];
        }
        
        db.run(sql, params, function(err) {
          if (err) {
            reject(err);
          } else {
            if (isProduction && process.env.DATABASE_URL) {
              // PostgreSQL - result should be available
              resolve({
                id: parseInt(id),
                email,
                username,
                first_name,
                last_name,
                url_site,
                role,
                updated: true
              });
            } else {
              // SQLite
              if (this.changes === 0) {
                reject(new Error('Account not found'));
              } else {
                resolve({
                  id: parseInt(id),
                  email,
                  username,
                  first_name,
                  last_name,
                  url_site,
                  role,
                  updated: true
                });
              }
            }
          }
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  // Find account by email
  static findByEmail(email) {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT id, email, username, password, first_name, last_name, url_site, role, create_date
        FROM bank_accounts
        WHERE email = ?
      `;
      
      db.get(sql, [email], (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }

  // Find account by username
  static findByUsername(username) {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT id, email, username, password, first_name, last_name, url_site, role, create_date
        FROM bank_accounts
        WHERE username = ?
      `;
      
      db.get(sql, [username], (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }

  // Get account by ID
  static getById(id) {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT id, email, username, first_name, last_name, url_site, role, create_date
        FROM bank_accounts
        WHERE id = ?
      `;
      
      db.get(sql, [id], (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }

  // Get all accounts
  static getAll() {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT id, email, username, first_name, last_name, url_site, role, create_date
        FROM bank_accounts
        ORDER BY create_date DESC
      `;
      
      db.all(sql, [], (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  // Authenticate user
  static authenticate(email, password) {
    return new Promise(async (resolve, reject) => {
      try {
        const account = await this.findByEmail(email);
        
        if (!account) {
          resolve(null);
          return;
        }

        const isValidPassword = await bcrypt.compare(password, account.password);
        
        if (isValidPassword) {
          // Return account without password
          const { password, ...accountWithoutPassword } = account;
          resolve(accountWithoutPassword);
        } else {
          resolve(null);
        }
      } catch (error) {
        reject(error);
      }
    });
  }
}

module.exports = BankAccount; 