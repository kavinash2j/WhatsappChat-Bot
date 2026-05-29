const mysql = require("mysql2/promise");

// Create a connection pool — reads credentials from .env
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
});

pool.getConnection()
    .then((conn) => {
        console.log("✅ Connected to MySQL database");
        conn.release();
    })
    .catch((err) => {
        console.error("❌ MySQL connection failed:", err.message);
    });

module.exports = pool;
