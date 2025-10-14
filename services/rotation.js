const { db } = require('../database.js');

const dbAll = async (sql, params = []) => {
  if (db.all && typeof db.all === 'function') {
    // SQLite database
    return new Promise((resolve, reject) => {
      db.all(sql, params, (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  } else {
    // PostgreSQL database
    const result = await db.query(sql, params);
    return result.rows || [];
  }
};

const dbRun = async (sql, params = []) => {
  if (db.run && typeof db.run === 'function') {
    // SQLite database
    return new Promise((resolve, reject) => {
      db.run(sql, params, function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({ lastID: this.lastID, changes: this.changes });
        }
      });
    });
  } else {
    // PostgreSQL database
    const result = await db.query(sql, params);
    return { lastID: result.insertId, changes: result.rowCount };
  }
};

const pickAlias = async (amount_cents) => {
  try {
    const currentTime = new Date();

    const query = `
      SELECT alias_email as email, bank_slug, id as alias_id, weight, last_used_at, daily_total_cents, cool_off_minutes
      FROM email_aliases
      WHERE active = 1
        AND (daily_total_cents + ?) < daily_cap_cents
        AND (last_used_at IS NULL OR last_used_at + INTERVAL '1 minute' * cool_off_minutes <= NOW())
      ORDER BY weight DESC, last_used_at ASC
      LIMIT 1
    `;

    const aliases = await dbAll(query, [amount_cents]);

    if (aliases.length === 0) {
      throw new Error('No available aliases found matching criteria');
    }

    const selectedAlias = aliases[0];

    await dbRun(
      'UPDATE email_aliases SET last_used_at = NOW(), daily_total_cents = daily_total_cents + ? WHERE id = ?',
      [amount_cents, selectedAlias.alias_id]
    );

    return {
      email: selectedAlias.email,
      bank_slug: selectedAlias.bank_slug,
      alias_id: selectedAlias.alias_id
    };

  } catch (error) {
    throw new Error(`Failed to pick alias: ${error.message}`);
  }
};

module.exports = {
  pickAlias,
  dbAll,
  dbRun
};