const { db } = require('../database');

class Order {
  // Create new order
  static create(orderData) {
    return new Promise((resolve, reject) => {
      const { 
        woo_order_id, 
        status, 
        total, 
        customer_name, 
        customer_email, 
        description, 
        ip_address, 
        bank_account_id 
      } = orderData;
      
      // Check if using PostgreSQL or SQLite
      const isProduction = process.env.NODE_ENV === 'production' || process.env.RENDER === 'true';
      
      let sql;
      if (isProduction && process.env.DATABASE_URL) {
        // PostgreSQL - return the inserted row
        sql = `
          INSERT INTO orders (woo_order_id, status, total, customer_name, customer_email, description, ip_address, bank_account_id)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          RETURNING id, woo_order_id, status, date, total, customer_name, customer_email, description, ip_address, bank_account_id
        `;
      } else {
        // SQLite
        sql = `
          INSERT INTO orders (woo_order_id, status, total, customer_name, customer_email, description, ip_address, bank_account_id)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `;
      }
      
      db.run(sql, [woo_order_id, status, total, customer_name, customer_email, description, ip_address, bank_account_id], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({
            id: this.lastID || 'generated',
            woo_order_id,
            status,
            date: new Date().toISOString(),
            total,
            customer_name,
            customer_email,
            description,
            ip_address,
            bank_account_id
          });
        }
      });
    });
  }

  // Get all orders
  static getAll() {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT o.id, o.woo_order_id, o.status, o.date, o.total, o.customer_name, 
               o.customer_email, o.description, o.ip_address, o.bank_account_id,
               b.url_site, b.username as bank_username
        FROM orders o
        LEFT JOIN bank_accounts b ON o.bank_account_id = b.id
        ORDER BY o.date DESC
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

  // Get order by ID
  static getById(id) {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT o.id, o.woo_order_id, o.status, o.date, o.total, o.customer_name, 
               o.customer_email, o.description, o.ip_address, o.bank_account_id,
               b.url_site, b.username as bank_username
        FROM orders o
        LEFT JOIN bank_accounts b ON o.bank_account_id = b.id
        WHERE o.id = ?
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

  // Get orders by bank account ID
  static getByBankAccountId(bankAccountId) {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT o.id, o.woo_order_id, o.status, o.date, o.total, o.customer_name, 
               o.customer_email, o.description, o.ip_address, o.bank_account_id,
               b.url_site, b.username as bank_username
        FROM orders o
        LEFT JOIN bank_accounts b ON o.bank_account_id = b.id
        WHERE o.bank_account_id = ?
        ORDER BY o.date DESC
      `;
      
      db.all(sql, [bankAccountId], (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  // Get orders with filters (by account, date range, status)
  static getWithFilters(filters = {}) {
    return new Promise((resolve, reject) => {
      let conditions = [];
      let params = [];
      
      // Filter by bank account
      if (filters.bank_account_id) {
        conditions.push('o.bank_account_id = ?');
        params.push(filters.bank_account_id);
      }
      
      // Filter by date range
      if (filters.start_date) {
        conditions.push('DATE(o.date) >= ?');
        params.push(filters.start_date);
      }
      
      if (filters.end_date) {
        conditions.push('DATE(o.date) <= ?');
        params.push(filters.end_date);
      }
      
      // Filter by status
      if (filters.status) {
        conditions.push('o.status = ?');
        params.push(filters.status);
      }
      
      // Filter by specific date
      if (filters.date) {
        conditions.push('DATE(o.date) = ?');
        params.push(filters.date);
      }
      
      const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';
      
      const sql = `
        SELECT o.id, o.woo_order_id, o.status, o.date, o.total, o.customer_name, 
               o.customer_email, o.description, o.ip_address, o.bank_account_id,
               b.url_site, b.username as bank_username
        FROM orders o
        LEFT JOIN bank_accounts b ON o.bank_account_id = b.id
        ${whereClause}
        ORDER BY o.date DESC
      `;
      
      db.all(sql, params, (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  // Get summary totals by account
  static getSummaryByAccount(filters = {}) {
    return new Promise((resolve, reject) => {
      let conditions = [];
      let params = [];
      
      // Filter by date range
      if (filters.start_date) {
        conditions.push('DATE(o.date) >= ?');
        params.push(filters.start_date);
      }
      
      if (filters.end_date) {
        conditions.push('DATE(o.date) <= ?');
        params.push(filters.end_date);
      }
      
      // Filter by specific date
      if (filters.date) {
        conditions.push('DATE(o.date) = ?');
        params.push(filters.date);
      }
      
      const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';
      
      const sql = `
        SELECT 
          b.id as bank_account_id,
          b.username as account_name,
          b.url_site,
          COUNT(o.id) as total_orders,
          SUM(o.total) as total_revenue,
          AVG(o.total) as avg_order_value,
          MIN(o.date) as first_order_date,
          MAX(o.date) as last_order_date
        FROM bank_accounts b
        LEFT JOIN orders o ON b.id = o.bank_account_id
        ${whereClause}
        GROUP BY b.id, b.username, b.url_site
        ORDER BY total_revenue DESC
      `;
      
      db.all(sql, params, (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  // Get summary totals by day
  static getSummaryByDay(filters = {}) {
    return new Promise((resolve, reject) => {
      let conditions = [];
      let params = [];
      
      // Filter by bank account
      if (filters.bank_account_id) {
        conditions.push('o.bank_account_id = ?');
        params.push(filters.bank_account_id);
      }
      
      // Filter by date range
      if (filters.start_date) {
        conditions.push('DATE(o.date) >= ?');
        params.push(filters.start_date);
      }
      
      if (filters.end_date) {
        conditions.push('DATE(o.date) <= ?');
        params.push(filters.end_date);
      }
      
      const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';
      
      const sql = `
        SELECT 
          DATE(o.date) as order_date,
          COUNT(o.id) as total_orders,
          SUM(o.total) as total_revenue,
          AVG(o.total) as avg_order_value,
          COUNT(CASE WHEN o.status = 'completed' THEN 1 END) as completed_orders,
          COUNT(CASE WHEN o.status = 'pending' THEN 1 END) as pending_orders,
          COUNT(CASE WHEN o.status = 'processing' THEN 1 END) as processing_orders
        FROM orders o
        ${whereClause}
        GROUP BY DATE(o.date)
        ORDER BY order_date DESC
      `;
      
      db.all(sql, params, (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  // Statistics by merchant (bank account)
  static getStatsByMerchant() {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT 
          b.url_site,
          b.username as merchant_name,
          COUNT(o.id) as total_orders,
          SUM(o.total) as total_revenue,
          AVG(o.total) as avg_order_value
        FROM bank_accounts b
        LEFT JOIN orders o ON b.id = o.bank_account_id
        GROUP BY b.id, b.url_site, b.username
        ORDER BY total_revenue DESC
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

  // Find bank account by URL site
  static findBankAccountByUrl(urlSite) {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT id, email, username, first_name, last_name, url_site, role, create_date
        FROM bank_accounts
        WHERE url_site = ?
      `;
      
      db.get(sql, [urlSite], (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }

  // Find bank account by ID
  static findBankAccountById(id) {
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

  // Find bank account by email
  static findBankAccountByEmail(email) {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT id, email, username, first_name, last_name, url_site, role, create_date
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

  // Update order status
  static updateStatus(id, status) {
    return new Promise((resolve, reject) => {
      const sql = `
        UPDATE orders 
        SET status = ?
        WHERE id = ?
      `;
      
      db.run(sql, [status, id], function(err) {
        if (err) {
          reject(err);
        } else {
          if (this.changes === 0) {
            reject(new Error('Order not found'));
          } else {
            resolve({ id: parseInt(id), status, updated: true });
          }
        }
      });
    });
  }

  // Update order with multiple fields
  static update(id, updateData) {
    return new Promise((resolve, reject) => {
      const fields = [];
      const values = [];
      
      // Build dynamic update fields
      if (updateData.woo_order_id !== undefined) {
        fields.push('woo_order_id = ?');
        values.push(updateData.woo_order_id);
      }
      if (updateData.status !== undefined) {
        fields.push('status = ?');
        values.push(updateData.status);
      }
      if (updateData.total !== undefined) {
        fields.push('total = ?');
        values.push(updateData.total);
      }
      if (updateData.customer_name !== undefined) {
        fields.push('customer_name = ?');
        values.push(updateData.customer_name);
      }
      if (updateData.customer_email !== undefined) {
        fields.push('customer_email = ?');
        values.push(updateData.customer_email);
      }
      if (updateData.description !== undefined) {
        fields.push('description = ?');
        values.push(updateData.description);
      }
      
      if (fields.length === 0) {
        return reject(new Error('No fields to update'));
      }
      
      values.push(id);
      
      const sql = `
        UPDATE orders 
        SET ${fields.join(', ')}
        WHERE id = ?
      `;
      
      db.run(sql, values, function(err) {
        if (err) {
          reject(err);
        } else {
          if (this.changes === 0) {
            reject(new Error('Order not found'));
          } else {
            // Return updated order
            Order.getById(id).then(order => {
              resolve(order);
            }).catch(reject);
          }
        }
      });
    });
  }

  // Delete order
  static delete(id) {
    return new Promise((resolve, reject) => {
      const sql = `
        DELETE FROM orders 
        WHERE id = ?
      `;
      
      db.run(sql, [id], function(err) {
        if (err) {
          reject(err);
        } else {
          if (this.changes === 0) {
            reject(new Error('Order not found'));
          } else {
            resolve({ id: parseInt(id), deleted: true });
          }
        }
      });
    });
  }
}

module.exports = Order; 