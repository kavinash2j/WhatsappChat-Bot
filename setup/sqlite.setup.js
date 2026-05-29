const sqlite3 = require('sqlite3').verbose();

// Open (or create) database file for SQLite-specific tables (like Tokens)
const sqliteDb = new sqlite3.Database('./mydata.db', (err) => {
    if (err) {
        console.error('Error opening SQLite database:', err.message);
    } else {
        console.log('✅ Connected to SQLite database');
    }
});

module.exports = sqliteDb;
