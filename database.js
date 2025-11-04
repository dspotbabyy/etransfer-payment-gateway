require('dotenv').config();
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Database configuration based on environment
const isProduction = process.env.NODE_ENV === 'production' || process.env.RENDER === 'true';
const DATABASE_URL = process.env.DATABASE_URL;

console.log('🔧 Database Configuration:');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('RENDER:', process.env.RENDER);
console.log('DATABASE_URL exists:', !!DATABASE_URL);
console.log('isProduction:', isProduction);

let db;

if (isProduction && DATABASE_URL) {
  // PostgreSQL for production (Render.com)
  console.log('🐘 Using PostgreSQL database for production');
  const { Pool } = require('pg');
  const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });
  
  // Test connection
  pool.connect((err, client, release) => {
    if (err) {
      console.error('❌ Error connecting to PostgreSQL:', err);
    } else {
      console.log('✅ Successfully connected to PostgreSQL');
      release();
    }
  });
  
  db = {
    run: (sql, params, callback) => {
      const query = sql.replace(/\?/g, (match, offset) => {
        const index = sql.substring(0, offset).split('?').length;
        return `$${index}`;
      });
      
      if (callback) {
        pool.query(query, params || [])
          .then(result => {
            // For INSERT statements, simulate lastID
            if (sql.toLowerCase().includes('insert') && result.rows && result.rows[0]) {
              callback.call({ lastID: result.rows[0].id }, null);
            } else {
              callback(null, result);
            }
          })
          .catch(err => callback(err));
      } else {
        return pool.query(query, params || []);
      }
    },
    get: (sql, params, callback) => {
      const query = sql.replace(/\?/g, (match, offset) => {
        const index = sql.substring(0, offset).split('?').length;
        return `$${index}`;
      });
      
      pool.query(query, params || [])
        .then(result => callback(null, result.rows[0]))
        .catch(err => callback(err));
    },
    all: (sql, params, callback) => {
      const query = sql.replace(/\?/g, (match, offset) => {
        const index = sql.substring(0, offset).split('?').length;
        return `$${index}`;
      });
      
      pool.query(query, params || [], (err, result) => {
        if (err) {
          callback(err);
        } else {
          callback(null, result.rows);
        }
      });
    },
    query: async (sql, params) => {
      const query = sql.replace(/\?/g, (match, offset) => {
        const index = sql.substring(0, offset).split('?').length;
        return `$${index}`;
      });
      
      const result = await pool.query(query, params || []);
      return result;
    },
    run: (sql, params, callback) => {
      const query = sql.replace(/\?/g, (match, offset) => {
        const index = sql.substring(0, offset).split('?').length;
        return `$${index}`;
      });
      
      pool.query(query, params || [], (err, result) => {
        if (err) {
          callback(err);
        } else {
          const mockThis = {
            lastID: result.insertId || result.rows[0]?.id,
            changes: result.rowCount || 0
          };
          // Use .call() to set 'this' in the callback (for SQLite compatibility)
          callback.call(mockThis, null);
        }
      });
    }
  };
} else {
  // SQLite for development
  console.log('🗄️  Using SQLite database for development');
  const dbPath = path.join(__dirname, 'orders.db');
  db = new sqlite3.Database(dbPath);
}

// Run database migrations
const runMigrations = () => {
  return new Promise((resolve, reject) => {
    const migrationsPath = path.join(__dirname, 'migrations');

    if (!fs.existsSync(migrationsPath)) {
      console.log('📁 No migrations directory found, skipping migrations');
      return resolve();
    }

    // Create migrations tracking table if it doesn't exist
    const createMigrationsTable = isProduction && DATABASE_URL
      ? `CREATE TABLE IF NOT EXISTS applied_migrations (
          id SERIAL PRIMARY KEY,
          filename TEXT UNIQUE NOT NULL,
          applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`
      : `CREATE TABLE IF NOT EXISTS applied_migrations (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          filename TEXT UNIQUE NOT NULL,
          applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`;

    db.run(createMigrationsTable, [], (err) => {
      if (err) {
        console.error('❌ Error creating migrations table:', err);
        return reject(err);
      }

      // Get list of applied migrations
      db.all('SELECT filename FROM applied_migrations', [], (err, appliedMigrations) => {
        if (err) {
          console.error('❌ Error reading applied migrations:', err);
          return reject(err);
        }

        const appliedFiles = appliedMigrations.map(row => row.filename);
        const migrationFiles = fs.readdirSync(migrationsPath)
          .filter(file => file.endsWith('.sql'))
          .sort();

        // Find new migrations to apply
        let pendingMigrations = migrationFiles.filter(file => !appliedFiles.includes(file));
        
        // Filter migrations based on database type
        if (isProduction && DATABASE_URL) {
          // PostgreSQL - use files without _sqlite suffix
          pendingMigrations = pendingMigrations.filter(file => !file.includes('_sqlite'));
        } else {
          // SQLite - use files with _sqlite suffix or files without database-specific suffix
          pendingMigrations = pendingMigrations.filter(file => 
            file.includes('_sqlite') || (!file.includes('_sqlite') && !file.includes('_postgres'))
          );
        }

        if (pendingMigrations.length === 0) {
          console.log('✅ No pending migrations to apply');
          return resolve();
        }

        console.log(`🔄 Applying ${pendingMigrations.length} pending migration(s)...`);

        // Apply pending migrations sequentially
        let migrationIndex = 0;
        const applyNextMigration = () => {
          if (migrationIndex >= pendingMigrations.length) {
            console.log('✅ All migrations applied successfully');
            return resolve();
          }

          const migrationFile = pendingMigrations[migrationIndex];
          const migrationPath = path.join(migrationsPath, migrationFile);

          try {
            const migrationSql = fs.readFileSync(migrationPath, 'utf8');
            console.log(`📄 Applying migration: ${migrationFile}`);

            // Split migration file into individual statements
            const statements = migrationSql
              .split(';')
              .map(stmt => {
                // Remove comment lines (lines that start with -- after trimming)
                const lines = stmt.split('\n')
                  .map(line => line.trim())
                  .filter(line => !line.startsWith('--') && line.length > 0);
                return lines.join('\n').trim();
              })
              .filter(stmt => stmt.length > 0);

            if (statements.length === 0) {
              console.log(`⚠️  No executable statements found in ${migrationFile}`);
              migrationIndex++;
              return applyNextMigration();
            }

            // Execute each statement sequentially
            let statementIndex = 0;
            const executeNextStatement = () => {
              if (statementIndex >= statements.length) {
                // All statements executed, record migration as applied
                db.run('INSERT INTO applied_migrations (filename) VALUES (?)', [migrationFile], (err) => {
                  if (err) {
                    console.error(`❌ Error recording migration ${migrationFile}:`, err);
                    return reject(err);
                  }

                  console.log(`✅ Migration ${migrationFile} applied successfully`);
                  migrationIndex++;
                  applyNextMigration();
                });
                return;
              }

              const statement = statements[statementIndex];
              db.run(statement, [], (err) => {
                if (err) {
                  console.error(`❌ Error executing statement ${statementIndex + 1} in migration ${migrationFile}:`, err);
                  console.error(`Statement: ${statement}`);
                  return reject(err);
                }

                console.log(`✅ Executed statement ${statementIndex + 1}/${statements.length} in ${migrationFile}`);
                statementIndex++;
                executeNextStatement();
              });
            };

            executeNextStatement();
          } catch (readErr) {
            console.error(`❌ Error reading migration file ${migrationFile}:`, readErr);
            return reject(readErr);
          }
        };

        applyNextMigration();
      });
    });
  });
};

// Initialize database tables
const initDatabase = () => {
  return new Promise((resolve, reject) => {
    // First run migrations
    runMigrations()
      .then(() => {
        if (isProduction && DATABASE_URL) {
      // PostgreSQL schema
      console.log('🐘 Creating PostgreSQL tables...');
      
      const createBankAccountsTable = `
        CREATE TABLE IF NOT EXISTS bank_accounts (
          id SERIAL PRIMARY KEY,
          email TEXT UNIQUE NOT NULL,
          username TEXT UNIQUE NOT NULL,
          password TEXT NOT NULL,
          first_name TEXT,
          last_name TEXT,
          url_site TEXT,
          role TEXT NOT NULL CHECK (role IN ('admin', 'customer')),
          create_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `;
      
      const createOrdersTable = `
        CREATE TABLE IF NOT EXISTS orders (
          id SERIAL PRIMARY KEY,
          woo_order_id TEXT,
          status TEXT NOT NULL DEFAULT 'pending',
          date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          total DECIMAL NOT NULL,
          customer_name TEXT,
          customer_email TEXT NOT NULL,
          description TEXT,
          ip_address TEXT,
          bank_account_id INTEGER REFERENCES bank_accounts(id)
        )
      `;
      
      db.run(createBankAccountsTable, [], (err) => {
        if (err) {
          console.error('Error creating bank_accounts table:', err);
          reject(err);
        } else {
          console.log('Bank accounts table created successfully');
          
          db.run(createOrdersTable, [], (err) => {
            if (err) {
              console.error('Error creating orders table:', err);
              reject(err);
            } else {
              console.log('Orders table created successfully');
              resolve();
            }
          });
        }
      });
    } else {
      // SQLite schema (existing code)
      db.run(`
        CREATE TABLE IF NOT EXISTS orders (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          woo_order_id TEXT,
          status TEXT NOT NULL DEFAULT 'pending',
          date DATETIME DEFAULT CURRENT_TIMESTAMP,
          total REAL NOT NULL,
          customer_name TEXT,
          customer_email TEXT NOT NULL,
          description TEXT,
          ip_address TEXT,
          bank_account_id INTEGER,
          FOREIGN KEY (bank_account_id) REFERENCES bank_accounts (id)
        )
      `, (err) => {
        if (err) {
          console.error('Error creating orders table:', err);
          reject(err);
        } else {
          console.log('Orders table created successfully with new structure');
          
          db.run(`
            CREATE TABLE IF NOT EXISTS bank_accounts (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              email TEXT UNIQUE NOT NULL,
              username TEXT UNIQUE NOT NULL,
              password TEXT NOT NULL,
              first_name TEXT,
              last_name TEXT,
              url_site TEXT,
              role TEXT NOT NULL CHECK (role IN ('admin', 'customer')),
              create_date DATETIME DEFAULT CURRENT_TIMESTAMP
            )
          `, (err) => {
            if (err) {
              console.error('Error creating bank_accounts table:', err);
              reject(err);
            } else {
              console.log('Bank accounts table created successfully');
              
              db.run(`ALTER TABLE bank_accounts ADD COLUMN first_name TEXT`, (err) => {
                if (err && !err.message.includes('duplicate column name')) {
                  console.error('Error adding first_name column:', err);
                }
              });
              
              db.run(`ALTER TABLE bank_accounts ADD COLUMN last_name TEXT`, (err) => {
                if (err && !err.message.includes('duplicate column name')) {
                  console.error('Error adding last_name column:', err);
                } else {
                  console.log('Database schema updated successfully');
                  resolve();
                }
              });
            }
          });
        }
      });
    }
  })
  .catch(err => {
        console.error('❌ Error running migrations:', err);
        reject(err);
      });
  });
};

module.exports = { db, initDatabase }; 