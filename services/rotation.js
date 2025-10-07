const { db } = require('../database.js');

const dbAll = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
};

const dbRun = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) {
        reject(err);
      } else {
        resolve({ lastID: this.lastID, changes: this.changes });
      }
    });
  });
};

const pickAlias = async (amount_cents) => {
  try {
    const currentTime = new Date();

    const query = `
      SELECT email, bank_slug, id as alias_id, weight, last_used_at, daily_total_cents, cool_off_minutes
      FROM email_aliases
      WHERE active = 1
        AND (daily_total_cents + ?) < daily_cap_cents
        AND (last_used_at IS NULL OR datetime(last_used_at, '+' || cool_off_minutes || ' minutes') <= datetime('now'))
      ORDER BY weight DESC, last_used_at ASC
      LIMIT 1
    `;

    const aliases = await dbAll(query, [amount_cents]);

    if (aliases.length === 0) {
      throw new Error('No available aliases found matching criteria');
    }

    const selectedAlias = aliases[0];

    await dbRun(
      'UPDATE email_aliases SET last_used_at = datetime(\'now\'), daily_total_cents = daily_total_cents + ? WHERE id = ?',
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